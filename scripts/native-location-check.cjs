const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
let now = 1700000000000,
  stored = null,
  running = false,
  permission = true,
  counter = 0;
let session = { username: "alih", token: "test-only" },
  calls = [],
  fail = null,
  updateGate = null;
const location = {
  Accuracy: { High: 4 },
  hasStartedLocationUpdatesAsync: async () => running,
  stopLocationUpdatesAsync: async () => {
    running = false;
  },
  startLocationUpdatesAsync: async (_name, options) => {
    assert.equal(options.foregroundService.killServiceOnDestroy, true);
    assert.ok(options.foregroundService.notificationTitle);
    running = true;
  },
  getBackgroundPermissionsAsync: async () => ({ granted: permission }),
};
const imports = {
  "@react-native-async-storage/async-storage": {
    getItem: async () => stored,
    setItem: async (_key, value) => {
      stored = value;
    },
    removeItem: async () => {
      stored = null;
    },
  },
  "expo-location": location,
  "expo-crypto": { randomUUID: () => `test-native-run-${++counter}` },
  "./session": { getNativeSession: async () => session },
  "./api": {
    activityRequest: async (route, data) => {
      calls.push({ route, data });
      if (route === "live/update" && updateGate) await updateGate();
      if (fail) throw fail;
      return {
        expires: now + 120000,
        endsAt: now + (data?.durationHours || 1) * 3600000,
        serverNow: now,
      };
    },
  },
};
const source = ts.transpileModule(
  fs.readFileSync("src/nativeLocationService.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;
const exportsObject = {};
vm.runInNewContext(source, {
  exports: exportsObject,
  require: (name) => {
    assert.ok(imports[name], name);
    return imports[name];
  },
  Date: class extends Date {
    static now() {
      return now;
    }
  },
});
const service = exportsObject;
const point = () => ({
  timestamp: now,
  coords: { latitude: -6.9, longitude: 107.6, accuracy: 5 },
});
const updates = () => calls.filter((c) => c.route === "live/update");
(async () => {
  for (const hours of [1, 3, 8]) {
    const run = await service.startNativeLocation("alih", null, hours);
    assert.equal(run.endsAt - now, hours * 3600000);
    assert.equal(calls.at(-1).data.durationHours, hours);
    const durable = JSON.parse(stored);
    now = run.endsAt - 1000;
    durable.leaseUntil = now + 120000;
    stored = JSON.stringify(durable);
    await service.deliverNativeLocations([point()]);
    assert.equal(
      running,
      true,
      `${hours}-hour share stays active before deadline`,
    );
    now += 1001;
    await service.deliverNativeLocations([point()]);
    assert.equal(running, false, `${hours}-hour deadline stops GPS`);
    assert.equal(stored, null);
  }
  calls = [];
  await service.startNativeLocation("alih", null);
  assert.equal(running, true);
  await service.deliverNativeLocations([point()]);
  now += 15000;
  await service.deliverNativeLocations([point()]);
  assert.deepEqual(
    updates().map((c) => c.data.sequence),
    [1, 2],
  );
  now += 15000;
  await service.deliverNativeLocations([
    { ...point(), timestamp: now - 60000 },
  ]);
  assert.equal(updates().length, 2, "old fixes never become fresh positions");
  let unblock, entered;
  const entry = new Promise((r) => {
    entered = r;
  });
  updateGate = () =>
    new Promise((r) => {
      unblock = r;
      entered();
    });
  const update = service.deliverNativeLocations([point()]);
  await entry;
  const stop = service.stopNativeLocation();
  unblock();
  await Promise.all([update, stop]);
  updateGate = null;
  assert.equal(stored, null, "late upload cannot restore stopped local state");
  assert.equal(running, false);
  const previousCount = updates().length;
  await service.deliverNativeLocations([point()]);
  assert.equal(updates().length, previousCount);
  await service.startNativeLocation("alih", null);
  fail = new Error("offline");
  assert.equal(await service.stopNativeLocation(), false);
  assert.equal(running, false, "offline stop still stops GPS");
  assert.equal(stored, null);
  fail = null;
  assert.equal(
    await service.reconcileNativeLocation("alih"),
    null,
    "reconnect cannot restart sharing",
  );
  await service.startNativeLocation("alih", null);
  now += 120001;
  await service.deliverNativeLocations([point()]);
  assert.equal(running, false, "expired lease stops upload and service");
  await service.startNativeLocation("alih", null);
  const state = JSON.parse(stored);
  state.endsAt = now - 1;
  stored = JSON.stringify(state);
  await service.deliverNativeLocations([point()]);
  assert.equal(running, false, "one-hour deadline stops sharing");
  await service.startNativeLocation("alih", null);
  permission = false;
  assert.equal(await service.reconcileNativeLocation("alih"), null);
  assert.equal(running, false, "permission revocation stops sharing");
  permission = true;
  await service.startNativeLocation("alih", null);
  session = { username: "nana" };
  const count = updates().length;
  await service.deliverNativeLocations([point()]);
  assert.equal(
    updates().length,
    count,
    "account switch cannot publish previous user's position",
  );
  assert.equal(running, false);
  session = { username: "alih" };
  await service.startNativeLocation("alih", null);
  fail = Object.assign(new Error("revoked"), { status: 401 });
  await service.deliverNativeLocations([point()]);
  assert.equal(running, false);
  assert.equal(stored, null);
  fail = null;
  const old = await service.startNativeLocation("alih", null);
  const replacement = await service.startNativeLocation("alih", null);
  await service.stopNativeLocation(old.id);
  assert.equal(
    JSON.parse(stored).id,
    replacement.id,
    "stale viewer refresh cannot stop a replacement run",
  );
  running = false;
  assert.equal(
    await service.reconcileNativeLocation("alih"),
    null,
    "process death cannot silently restart GPS",
  );
  assert.equal(stored, null);
  console.log(
    "PASS native lifecycle: ordered callbacks, stale GPS, concurrent stop, offline stop, lease/duration expiry, revoked permission/token, account switch, replacement run, no automatic restart. Native OS mocked; real-device testing still required.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
