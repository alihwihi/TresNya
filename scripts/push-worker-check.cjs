const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
(async () => {
  const handlers = {},
    shown = [],
    visits = [];
  let windows = [],
    closed = false;
  const self = {
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    registration: {
      showNotification: async (title, options) =>
        shown.push({ title, ...options }),
    },
    location: { origin: "https://tresnya.example" },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url) => visits.push(url),
    },
  };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { self, URL });
  let work;
  handlers.push({
    data: {
      json: () => ({
        title: "Kabar baru",
        body: "Nana memperbarui status.",
        id: "status-1",
      }),
    },
    waitUntil: (p) => {
      work = p;
    },
  });
  await work;
  assert.equal(shown[0].tag, "status-1");
  assert.equal(shown[0].body, "Nana memperbarui status.");
  handlers.push({
    data: {
      json: () => {
        throw new Error("Malformed payload");
      },
    },
    waitUntil: (p) => {
      work = p;
    },
  });
  await work;
  assert.equal(shown[1].title, "Kabar baru di TresNya");
  const click = {
    notification: {
      close: () => {
        closed = true;
      },
    },
    waitUntil: (p) => {
      work = p;
    },
  };
  handlers.notificationclick(click);
  await work;
  assert.equal(closed, true);
  assert.equal(visits[0], "/?screen=location");
  windows = [
    {
      url: "https://tresnya.example/",
      navigate: async (url) => visits.push(url),
      focus: async () => visits.push("focus"),
    },
  ];
  handlers.notificationclick(click);
  await work;
  assert.equal(visits[2], "focus");
  console.log(
    "PASS: service worker push display, malformed-payload fallback, unique status tags, notification tap opens/focuses location screen. Worker APIs mocked.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
