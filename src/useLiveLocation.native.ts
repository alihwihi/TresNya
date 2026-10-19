import { useEffect, useRef, useState } from "react";
import { Alert, AppState, PermissionsAndroid, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { Account } from "./AuthGate";
import type { LivePoint, LiveLocation } from "./useLiveLocation";
import { activityRequest } from "./api";
import {
  startNativeLocation,
  stopNativeLocation,
  reconcileNativeLocation,
} from "./nativeLocationService";

function consent(partner: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      "Bagikan lokasi di latar belakang?",
      `Posisi GPS dan foto profilmu dibagikan ke ${partner} hingga satu jam, termasuk saat layar terkunci. Android menampilkan notifikasi selama berbagi. Kamu dapat menghentikannya kapan saja di halaman Lokasi. Pilih “Izinkan sepanjang waktu” pada pengaturan izin lokasi berikutnya.`,
      [
        { text: "Batal", style: "cancel", onPress: () => resolve(false) },
        { text: "Lanjutkan", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
export function useLiveLocation(
  account: Account,
  photo?: string,
): LiveLocation {
  const [snapshot, setSnapshot] = useState<{
    mine: LivePoint | null;
    partner: LivePoint | null;
  }>({ mine: null, partner: null });
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const offset = useRef(0),
    alive = useRef(true),
    pending = useRef(false),
    fetching = useRef(false);
  async function refresh() {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const run = await reconcileNativeLocation(account.username);
      if (alive.current) setSharing(!!run);
      const next = await activityRequest("live/state");
      if (alive.current) {
        offset.current = next.serverNow - Date.now();
        setSnapshot(next);
        setConnectionError("");
        if (run && next.mine?.shareId !== run.id) {
          await stopNativeLocation(run.id);
          setSharing(false);
          setMessage(
            "Sesi live berakhir atau diganti di perangkat lain. Mulai lagi saat siap.",
          );
        }
      }
    } catch {
      if (alive.current)
        setConnectionError(
          "Koneksi terputus. Posisi lama bukan posisi terkini dan akan kedaluwarsa.",
        );
    } finally {
      fetching.current = false;
    }
  }
  async function stop(reason = "Berbagi live dihentikan.") {
    try {
      const delivered = await stopNativeLocation();
      if (alive.current) {
        setSharing(false);
        setMessage(
          delivered
            ? reason
            : "GPS berhenti. Server belum terhubung; penanda akan hilang maksimal 2 menit setelah kiriman terakhir.",
        );
        void refresh();
      }
    } catch {
      if (alive.current)
        setMessage(
          "Belum dapat menghentikan GPS. Coba lagi atau cabut izin lokasi TresNya di Pengaturan Android.",
        );
    }
  }
  async function start() {
    if (pending.current || sharing) return;
    pending.current = true;
    setMessage("Menyiapkan izin lokasi…");
    try {
      if (Platform.OS !== "android")
        throw new Error(
          "Berbagi di latar belakang saat ini tersedia pada aplikasi Android.",
        );
      if (!(await TaskManager.isAvailableAsync()))
        throw new Error(
          "Gunakan APK TresNya, bukan Expo Go, untuk lokasi di latar belakang.",
        );
      if (!(await consent(account.partner))) {
        setMessage("Berbagi belum dimulai.");
        return;
      }
      if (!(await Location.requestForegroundPermissionsAsync()).granted)
        throw new Error(
          "Izinkan akses lokasi di pengaturan aplikasi lalu coba lagi.",
        );
      if (!(await Location.requestBackgroundPermissionsAsync()).granted)
        throw new Error(
          "Pilih Izinkan sepanjang waktu di Pengaturan Android → Aplikasi → TresNya → Izin → Lokasi.",
        );
      if (
        Number(Platform.Version) >= 33 &&
        (await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        )) !== PermissionsAndroid.RESULTS.GRANTED
      )
        throw new Error(
          "Izinkan notifikasi agar status berbagi lokasi terlihat di ponsel.",
        );
      if (!(await Location.hasServicesEnabledAsync()))
        throw new Error("Aktifkan GPS ponsel lalu coba lagi.");
      if (AppState.currentState !== "active")
        throw new Error("Kembali ke TresNya dan tekan Mulai lagi.");
      let thumbnail: string | null = null;
      if (photo) {
        const image = await manipulateAsync(
          photo,
          [{ resize: { width: 96 } }],
          { base64: true, compress: 0.7, format: SaveFormat.JPEG },
        );
        if (image.base64) thumbnail = `data:image/jpeg;base64,${image.base64}`;
      }
      await startNativeLocation(account.username, thumbnail);
      if (alive.current) {
        setSharing(true);
        setMessage(
          "Live aktif hingga 1 jam, termasuk saat layar terkunci. Buka halaman ini untuk menghentikan.",
        );
        void refresh();
      }
    } catch (error) {
      if (alive.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Lokasi belum dapat dibagikan.",
        );
    } finally {
      pending.current = false;
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    const poll = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 3000);
    const tick = setInterval(() => setClock(Date.now()), 1000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    // Navigating away or backgrounding must not stop an explicitly started native share.
    return () => {
      alive.current = false;
      clearInterval(poll);
      clearInterval(tick);
      listener.remove();
    };
  }, [account.username]);
  const serverTime = clock + offset.current;
  return {
    mine:
      snapshot.mine && snapshot.mine.expires > serverTime
        ? snapshot.mine
        : null,
    partner:
      snapshot.partner && snapshot.partner.expires > serverTime
        ? snapshot.partner
        : null,
    sharing,
    message,
    connectionError,
    start,
    stop,
    refresh,
    serverTime,
  };
}
