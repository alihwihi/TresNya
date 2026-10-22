export async function mapPhoto(uri?: string): Promise<string | null> {
  if (!uri) return null;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Foto profil belum bisa diproses."));
        return;
      }
      const side = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        96,
        96,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () =>
      reject(new Error("Foto profil belum bisa dibuka. Pilih ulang fotomu."));
    img.src = uri;
  });
}
