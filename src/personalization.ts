import { Platform } from "react-native";

import { defaultQuotes, Personalization } from "./personalization.shared";
export { defaultQuotes, Personalization } from "./personalization.shared";
const key = (username: string) => `tresnya:personalization:v1:${username}`;

export function readPersonalization(username: string): Personalization {
  try {
    if (Platform.OS !== "web") return { ...defaultQuotes };
    const saved = JSON.parse(
      window.localStorage.getItem(key(username)) || "{}",
    );
    return {
      badgeQuote:
        typeof saved.badgeQuote === "string" &&
        saved.badgeQuote.trim() &&
        saved.badgeQuote.length <= 80
          ? saved.badgeQuote
          : defaultQuotes.badgeQuote,
      sidebarQuote:
        typeof saved.sidebarQuote === "string" &&
        saved.sidebarQuote.trim() &&
        saved.sidebarQuote.length <= 200
          ? saved.sidebarQuote
          : defaultQuotes.sidebarQuote,
      profilePhoto:
        typeof saved.profilePhoto === "string" &&
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(saved.profilePhoto)
          ? saved.profilePhoto
          : undefined,
    };
  } catch {
    return { ...defaultQuotes };
  }
}

// Persist before updating the UI so a storage failure cannot look like a save.
export function savePersonalization(username: string, value: Personalization) {
  if (Platform.OS === "web")
    window.localStorage.setItem(key(username), JSON.stringify(value));
}

export async function loadPersonalization(_username: string) {}
