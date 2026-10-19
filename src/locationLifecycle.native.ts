import { stopNativeLocation } from "./nativeLocationService";
export async function stopSessionLocation() {
  await stopNativeLocation();
}
