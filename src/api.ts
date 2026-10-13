import { Platform } from "react-native";
export const apiOrigin =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.location.port === "8081"
    ? `${window.location.protocol}//${window.location.hostname}:4173`
    : "";
export async function activityRequest(route: string, data?: object) {
  const response = await fetch(`${apiOrigin}/api/activity/${route}`, {
    method: data ? "POST" : "GET",
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || "Belum berhasil. Coba lagi.");
  return payload;
}
