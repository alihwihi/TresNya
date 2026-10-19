import { Platform } from "react-native";
import { getNativeSession, saveNativeSession } from "./session";
export const apiOrigin =
  Platform.OS === "web"
    ? typeof window !== "undefined" && window.location.port === "8081"
      ? `${window.location.protocol}//${window.location.hostname}:4173`
      : ""
    : (process.env.EXPO_PUBLIC_API_URL || "https://tresnya.vercel.app").replace(
        /\/$/,
        "",
      );
export async function apiRequest(
  path: string,
  data?: object,
  options?: { signal?: AbortSignal; keepalive?: boolean },
) {
  if (Platform.OS !== "web" && !/^https:\/\/[^/?#]+$/.test(apiOrigin))
    throw new Error("Alamat server aplikasi harus menggunakan HTTPS.");
  const session = Platform.OS !== "web" ? await getNativeSession() : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${apiOrigin}/api/${path}`, {
      method: data ? "POST" : "GET",
      credentials: Platform.OS === "web" ? "include" : "omit",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: options?.signal || controller.signal,
      ...(Platform.OS === "web" && options?.keepalive
        ? { keepalive: true }
        : {}),
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error(
        "Layanan belum tersedia. Pemilik aplikasi perlu memeriksa deployment API.",
      );
    return { response, payload: await response.json() };
  } finally {
    clearTimeout(timer);
  }
}
export async function authRequest(route: string, data?: object) {
  const nativeLogin = Platform.OS !== "web" && route === "login";
  const result = await apiRequest(
    `auth/${nativeLogin ? "native-login" : route}`,
    data,
  );
  if (nativeLogin && result.response.ok) {
    const { token, user, expires } = result.payload;
    if (
      typeof token !== "string" ||
      !/^tn_[A-Za-z0-9_-]{43}$/.test(token) ||
      !Number.isFinite(expires)
    )
      throw new Error("Server perlu diperbarui untuk login Android.");
    try {
      await saveNativeSession({ token, username: user.username, expires });
    } catch {
      await fetch(`${apiOrigin}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }).catch(() => {});
      throw new Error("Sesi belum bisa disimpan dengan aman. Coba masuk lagi.");
    }
  }
  return result;
}
export async function activityRequest(
  route: string,
  data?: object,
  options?: { signal?: AbortSignal; keepalive?: boolean },
) {
  const { response, payload } = await apiRequest(
    `activity/${route}`,
    data,
    options,
  );
  if (!response.ok)
    throw Object.assign(
      new Error(payload.error || "Belum berhasil. Coba lagi."),
      { status: response.status },
    );
  return payload;
}
