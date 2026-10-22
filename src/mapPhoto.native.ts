import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export async function mapPhoto(uri?: string): Promise<string | null> {
  if (!uri) return null;
  const image = await manipulateAsync(uri, [{ resize: { width: 96 } }], {
    base64: true,
    compress: 0.75,
    format: SaveFormat.JPEG,
  });
  if (!image.base64) throw new Error("Foto profil belum bisa diproses.");
  return `data:image/jpeg;base64,${image.base64}`;
}
