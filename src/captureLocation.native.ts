import * as Location from "expo-location";
export async function captureLocation() {
  if (!(await Location.requestForegroundPermissionsAsync()).granted)
    throw new Error("Izinkan lokasi di pengaturan aplikasi lalu coba lagi.");
  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  if (result.coords.accuracy === null)
    throw new Error("GPS belum akurat. Coba lagi.");
  return result;
}
