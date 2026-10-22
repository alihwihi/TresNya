import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import { activityRequest } from "./api";
import { getNativeSession } from "./session";
import type { LocationDuration } from "./useLiveLocation";

export const LOCATION_TASK = "tresnya-background-location-v1";
const KEY = "tresnya.live-run.v1";
type Run = {
  id: string;
  username: string;
  endsAt: number;
  leaseUntil: number;
  sequence: number;
  lastSent: number;
};
let queue: Promise<unknown> = Promise.resolve();
// Serialize task callbacks, UI stop, and startup so an in-flight callback cannot restore a stopped run.
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => {});
  return next;
}
async function read(): Promise<Run | null> {
  const value = await AsyncStorage.getItem(KEY);
  if (!value) return null;
  try {
    const run = JSON.parse(value) as Run;
    if (
      typeof run.id === "string" &&
      ["alih", "nana"].includes(run.username) &&
      [run.endsAt, run.leaseUntil, run.sequence, run.lastSent].every(
        Number.isFinite,
      )
    )
      return run;
  } catch {}
  await AsyncStorage.removeItem(KEY);
  return null;
}
async function stopUnlocked() {
  const run = await read();
  // Clear durable intent before network I/O. No reconnection or process restart may restart GPS.
  await AsyncStorage.removeItem(KEY);
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  let delivered = true;
  if (run) {
    try {
      await activityRequest("live/stop", { shareId: run.id });
    } catch {
      delivered = false;
    }
  }
  return delivered;
}
export const stopNativeLocation = (expectedId?: string) =>
  exclusive(async () => {
    if (expectedId && (await read())?.id !== expectedId) return true;
    return stopUnlocked();
  });
export function startNativeLocation(
  username: string,
  photo: string | null,
  durationHours: LocationDuration = 1,
) {
  return exclusive(async () => {
    await stopUnlocked();
    const session = await getNativeSession();
    if (!session || session.username !== username)
      throw new Error("Masuk kembali untuk berbagi lokasi.");
    const id = Crypto.randomUUID();
    // Persist intent before requesting the server, so an uncertain response can still be stopped.
    let run: Run = {
      id,
      username,
      endsAt: Date.now() + durationHours * 3600000,
      leaseUntil: Date.now() + 120000,
      sequence: 0,
      lastSent: 0,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(run));
    try {
      const result = await activityRequest("live/start", {
        shareId: id,
        photo,
        mode: "background",
        durationHours,
      });
      if (!Number.isFinite(result.expires) || !Number.isFinite(result.endsAt))
        throw new Error("Server perlu diperbarui untuk lokasi Android.");
      run = {
        ...run,
        endsAt: Date.now() + result.endsAt - result.serverNow,
        leaseUntil: Date.now() + result.expires - result.serverNow,
      };
      await AsyncStorage.setItem(KEY, JSON.stringify(run));
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000,
        distanceInterval: 0,
        deferredUpdatesInterval: 0,
        foregroundService: {
          notificationTitle: "TresNya · berbagi lokasi aktif",
          notificationBody: `Lokasi dibagikan hingga ${durationHours} jam. Buka TresNya untuk menghentikan.`,
          notificationColor: "#A16C74",
          killServiceOnDestroy: true,
        },
      });
      return run;
    } catch (error) {
      await stopUnlocked();
      throw error;
    }
  });
}
export function reconcileNativeLocation(username: string) {
  return exclusive(async () => {
    const run = await read();
    const started =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!run) {
      if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      return null;
    }
    const session = await getNativeSession();
    const permission = await Location.getBackgroundPermissionsAsync();
    if (
      !started ||
      !session ||
      session.username !== username ||
      run.username !== username ||
      !permission.granted ||
      Date.now() >= Math.min(run.endsAt, run.leaseUntil)
    ) {
      await stopUnlocked();
      return null;
    }
    return run;
  });
}
export function deliverNativeLocations(
  locations: Location.LocationObject[],
  failed = false,
) {
  return exclusive(async () => {
    const run = await read();
    if (!run) {
      await stopUnlocked();
      return;
    }
    const session = await getNativeSession();
    if (
      failed ||
      !session ||
      session.username !== run.username ||
      Date.now() >= Math.min(run.endsAt, run.leaseUntil)
    ) {
      await stopUnlocked();
      return;
    }
    const position = [...locations].sort(
      (a, b) => b.timestamp - a.timestamp,
    )[0];
    if (
      !position ||
      Date.now() - position.timestamp > 25000 ||
      position.timestamp > Date.now() + 10000 ||
      position.coords.accuracy === null ||
      Date.now() - run.lastSent < 10000
    )
      return;
    run.sequence++;
    run.lastSent = Date.now();
    await AsyncStorage.setItem(KEY, JSON.stringify(run));
    try {
      const result = await activityRequest("live/update", {
        shareId: run.id,
        sequence: run.sequence,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        captured: position.timestamp,
      });
      run.leaseUntil = Date.now() + result.expires - result.serverNow;
      await AsyncStorage.setItem(KEY, JSON.stringify(run));
    } catch (error) {
      if ([401, 409].includes((error as { status?: number }).status || 0))
        await stopUnlocked();
      // Retry only a fresh GPS reading on the next callback; do not replay a trail after reconnecting.
    }
  });
}
