export function captureLocation(): Promise<GeolocationPosition> {
  if (!window.isSecureContext || !navigator.geolocation)
    return Promise.reject(
      new Error("Buka melalui HTTPS untuk membagikan lokasi."),
    );
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Izin lokasi ditolak. Izinkan lokasi pada pengaturan browser lalu coba lagi."
              : error.code === 3
                ? "GPS terlalu lama merespons. Coba lagi di tempat terbuka."
                : "Lokasi belum tersedia. Periksa GPS perangkat.",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    ),
  );
}
