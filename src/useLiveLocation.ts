import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Account } from "./AuthGate";
import { activityRequest } from "./api";
import { mapPhoto } from "./mapPhoto";
import { useLivePhoto } from "./useLivePhoto";

export type LocationDuration = 1 | 3 | 8;
export type LivePoint = {
  username: string;
  shareId?: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  captured: number | null;
  updated: number | null;
  expires: number;
  endsAt?: number;
  photo: string | null;
};
type Snapshot = {
  mine: LivePoint | null;
  partner: LivePoint | null;
  serverNow: number;
};
type Run = {
  id: string;
  watch?: number;
  timer?: ReturnType<typeof setInterval>;
  seq: number;
  latest?: GeolocationPosition;
  sending: boolean;
  lastSent: number;
  leaseUntil: number;
  endsAt: number;
  started?: Promise<unknown>;
};
async function request(route: string, data?: object, keepalive = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await activityRequest(`live/${route}`, data, {
      signal: controller.signal,
      keepalive,
    });
  } finally {
    clearTimeout(timer);
  }
}
export function useLiveLocation(account: Account, photo?: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    mine: null,
    partner: null,
    serverNow: Date.now(),
  });
  const [clock, setClock] = useState(Date.now());
  const offset = useRef(0);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const run = useRef<Run | null>(null);
  const mounted = useRef(true);
  const fetching = useRef(false);
  const photoError = useLivePhoto(
    sharing ? snapshot.mine?.shareId : undefined,
    photo,
  );
  async function refresh() {
    if (fetching.current || Platform.OS !== "web") return;
    fetching.current = true;
    try {
      const next: Snapshot = await request("state");
      if (mounted.current) {
        offset.current = next.serverNow - Date.now();
        setSnapshot(next);
        setConnectionError("");
      }
    } catch {
      if (mounted.current)
        setConnectionError(
          "Koneksi live terputus. Titik lama akan menghilang saat sesi kedaluwarsa.",
        );
    } finally {
      fetching.current = false;
    }
  }
  async function stop(reason = "Berbagi live dihentikan.") {
    const active = run.current;
    run.current = null;
    if (active?.watch !== undefined)
      navigator.geolocation.clearWatch(active.watch);
    if (active?.timer) clearInterval(active.timer);
    if (mounted.current) {
      setSharing(false);
      setMessage(reason);
    }
    if (active) {
      try {
        // An in-flight start must finish before its matching stop, but updates can never resurrect a deleted row.
        await active.started?.catch(() => {});
        await request("stop", { shareId: active.id }, true);
      } catch {
        if (mounted.current)
          setMessage(
            "GPS sudah berhenti. Server belum terhubung; titik terakhir akan hilang dalam maksimal 45 detik.",
          );
      }
    }
    if (mounted.current) void refresh();
  }
  async function start(durationHours: LocationDuration = 1) {
    if (run.current) return;
    if (
      Platform.OS !== "web" ||
      !window.isSecureContext ||
      !navigator.geolocation
    ) {
      setMessage(
        "Live location membutuhkan browser HTTPS atau localhost dengan izin lokasi.",
      );
      return;
    }
    const active: Run = {
      id: crypto.randomUUID(),
      seq: 0,
      sending: false,
      lastSent: 0,
      leaseUntil: Date.now() + 45000,
      endsAt: Date.now() + durationHours * 3600000,
    };
    run.current = active;
    setSharing(true);
    setMessage("Meminta izin dan menunggu GPS…");
    try {
      const avatar = await mapPhoto(photo);
      if (run.current !== active) return;
      const starting = request("start", {
        shareId: active.id,
        photo: avatar,
        durationHours,
      });
      active.started = starting;
      const lease = await starting;
      if (run.current !== active) return;
      active.leaseUntil = Date.now() + lease.expires - lease.serverNow;
      active.endsAt = Date.now() + lease.endsAt - lease.serverNow;
      const send = async () => {
        if (
          run.current !== active ||
          active.sending ||
          !active.latest ||
          Date.now() - active.lastSent < 3000
        )
          return;
        const p = active.latest;
        if (Date.now() - p.timestamp > 25000) return;
        active.sending = true;
        active.lastSent = Date.now();
        try {
          await request("update", {
            shareId: active.id,
            sequence: ++active.seq,
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
            captured: p.timestamp,
          });
          if (run.current === active) {
            active.leaseUntil = Date.now() + 45000;
            setMessage("Live aktif · posisi diperbarui otomatis.");
            void refresh();
          }
        } catch (e) {
          if (run.current !== active) return;
          if ([401, 409].includes((e as { status?: number }).status || 0))
            void stop(
              "Sesi live berakhir atau diganti. Tekan Mulai untuk berbagi lagi.",
            );
          else
            setMessage(
              "Belum terkirim. Periksa koneksi; menunggu GPS terbaru.",
            );
        } finally {
          active.sending = false;
        }
      };
      const success = (p: GeolocationPosition) => {
        if (run.current === active) {
          active.latest = p;
          void send();
        }
      };
      const fail = (e: GeolocationPositionError) => {
        if (run.current !== active) return;
        if (e.code === 1)
          void stop(
            "Izin lokasi ditolak atau dicabut. Berbagi live dihentikan.",
          );
        else
          setMessage(
            "GPS belum tersedia. Titik terakhir tidak dianggap sebagai posisi terbaru.",
          );
      };
      const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      };
      active.watch = navigator.geolocation.watchPosition(
        success,
        fail,
        options,
      );
      let tick = 0;
      active.timer = setInterval(() => {
        if (run.current !== active) return;
        if (Date.now() >= Math.min(active.leaseUntil, active.endsAt)) {
          void stop("Sesi live berakhir. Tekan Mulai untuk berbagi lagi.");
          return;
        }
        void send();
        // Obtain a fresh fix when watchPosition emits nothing while stationary.
        if (++tick % 5 === 0)
          navigator.geolocation.getCurrentPosition(success, fail, options);
      }, 3000);
    } catch {
      if (run.current === active)
        await stop("Live belum dapat dimulai. Periksa koneksi dan coba lagi.");
    }
  }
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const poll = setInterval(() => {
      if (Platform.OS === "web" && document.visibilityState === "visible")
        void refresh();
    }, 3000);
    const clockTimer = setInterval(() => setClock(Date.now()), 1000);
    const hidden = () => {
      if (document.visibilityState === "hidden" && run.current)
        void stop(
          "Berbagi berhenti karena halaman tidak aktif. Mulai lagi saat siap.",
        );
      else void refresh();
    };
    const leave = () => {
      if (run.current) void stop();
    };
    if (Platform.OS === "web") {
      document.addEventListener("visibilitychange", hidden);
      window.addEventListener("pagehide", leave);
    }
    return () => {
      mounted.current = false;
      clearInterval(poll);
      clearInterval(clockTimer);
      if (Platform.OS === "web") {
        document.removeEventListener("visibilitychange", hidden);
        window.removeEventListener("pagehide", leave);
      }
      void stop();
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
    connectionError: connectionError || photoError,
    start,
    stop,
    refresh,
    serverTime,
  };
}
export type LiveLocation = ReturnType<typeof useLiveLocation>;
