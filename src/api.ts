import { Platform } from "react-native";
export const apiOrigin =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.location.port === "8081"
    ? `${window.location.protocol}//${window.location.hostname}:4173`
    : "";
export async function activityRequest(
  route: string,
  data?: object,
  options?: { signal?: AbortSignal; keepalive?: boolean },
) {
  const response = await fetch(`${apiOrigin}/api/activity/${route}`, {
    method: data ? "POST" : "GET",
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "Layanan aktivitas belum tersedia. Pemilik aplikasi perlu memeriksa deployment API.",
    );
  const payload = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(payload.error || "Belum berhasil. Coba lagi."),
      { status: response.status },
    );
  return payload;
}
