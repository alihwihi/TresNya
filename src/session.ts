export type NativeSession = {
  token: string;
  username: string;
  expires: number;
};
export async function getNativeSession(): Promise<NativeSession | null> {
  return null;
}
export async function saveNativeSession(_session: NativeSession) {}
export async function clearNativeSession() {}
