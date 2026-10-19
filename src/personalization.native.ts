import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultQuotes, Personalization } from "./personalization.shared";
export { defaultQuotes, Personalization } from "./personalization.shared";
const cache = new Map<string, Personalization>();
const key = (username: string) => `tresnya:personalization:v1:${username}`;
export async function loadPersonalization(username: string) {
  try {
    const value = JSON.parse(
      (await AsyncStorage.getItem(key(username))) || "{}",
    );
    cache.set(username, {
      badgeQuote:
        typeof value.badgeQuote === "string" &&
        value.badgeQuote.trim() &&
        value.badgeQuote.length <= 80
          ? value.badgeQuote
          : defaultQuotes.badgeQuote,
      sidebarQuote:
        typeof value.sidebarQuote === "string" &&
        value.sidebarQuote.trim() &&
        value.sidebarQuote.length <= 200
          ? value.sidebarQuote
          : defaultQuotes.sidebarQuote,
      profilePhoto:
        typeof value.profilePhoto === "string" &&
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value.profilePhoto)
          ? value.profilePhoto
          : undefined,
    });
  } catch {
    cache.set(username, { ...defaultQuotes });
  }
}
export function readPersonalization(username: string): Personalization {
  return cache.get(username) || { ...defaultQuotes };
}
export async function savePersonalization(
  username: string,
  value: Personalization,
) {
  await AsyncStorage.setItem(key(username), JSON.stringify(value));
  cache.set(username, value);
}
