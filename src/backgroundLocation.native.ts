import * as TaskManager from "expo-task-manager";
import type { LocationObject } from "expo-location";
import {
  deliverNativeLocations,
  LOCATION_TASK,
  stopNativeLocation,
} from "./nativeLocationService";

// Must be loaded before registerRootComponent, including Android headless launches.
TaskManager.defineTask<{ locations: LocationObject[] }>(
  LOCATION_TASK,
  async ({ data, error }) => {
    try {
      await deliverNativeLocations(data?.locations || [], !!error);
    } catch {
      await stopNativeLocation().catch(() => {});
    }
  },
);
