import * as SecureStore from "expo-secure-store";
import type { NativeSession } from "./session";
const KEY = "tresnya.native-session.v1";
const options = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
export async function getNativeSession(): Promise<NativeSession | null> {
  const value = await SecureStore.getItemAsync(KEY, options);
  if (!value) return null;
  const session = JSON.parse(value) as NativeSession;
  return /^tn_[A-Za-z0-9_-]{43}$/.test(session.token) &&
    session.expires > Date.now()
    ? session
    : null;
}
export async function saveNativeSession(session: NativeSession) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session), options);
}
export async function clearNativeSession() {
  await SecureStore.deleteItemAsync(KEY, options);
}
