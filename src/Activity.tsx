import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Account } from "./AuthGate";
import { activityRequest } from "./api";
import { Badge, Body, Button, Card, Field, Label, Title } from "./ui";

export type Checkin = {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
  captured: number;
  created: number;
};
type Status = { id: string; username: string; text: string; created: number };
type ActivityState = {
  mine: Checkin[];
  partner: Checkin[];
  statuses: Status[];
  pushEnabled: boolean;
  publicKey: string | null;
  mapsKey: string | null;
};
const when = (time: number) =>
  new Date(time).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export const mapsUrl = (p: Checkin) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.latitude},${p.longitude}`)}`;
const supportedPush = () =>
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export function useActivity(account: Account) {
  const [data, setData] = useState<ActivityState | null>(null);
  const [error, setError] = useState("");
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const next = await activityRequest("state");
      if (alive.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Koneksi terputus. Coba lagi.",
        );
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 10000);
    const onFocus = () => {
      void refresh();
    };
    if (Platform.OS === "web") window.addEventListener("focus", onFocus);
    return () => {
      alive.current = false;
      clearInterval(timer);
      if (Platform.OS === "web") window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!supportedPush()) return;
    let cancelled = false;
    // Existing device subscriptions are rebound after login and server restarts.
    navigator.serviceWorker
      .getRegistration("/")
      .then(async (registration) => {
        const sub = await registration?.pushManager.getSubscription();
        if (
          sub &&
          Notification.permission === "granted" &&
          data?.pushEnabled &&
          !cancelled
        ) {
          await activityRequest("push/subscribe", {
            subscription: sub.toJSON(),
          });
          if (!cancelled) setPushOn(true);
        }
      })
      .catch(() => {
        if (!cancelled) setPushOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account.username, data?.pushEnabled]);
  async function togglePush() {
    setPushBusy(true);
    setError("");
    try {
      if (!supportedPush())
        throw new Error(
          "Buka lewat HTTPS di browser yang mendukung notifikasi. Di iPhone, tambahkan ke Layar Utama lalu buka dari sana.",
        );
      if (pushOn) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const sub = await registration?.pushManager.getSubscription();
        if (sub) {
          await activityRequest("push/unsubscribe", { endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
        setPushOn(false);
      } else {
        if (!data?.publicKey)
          throw new Error("Notifikasi ponsel belum dikonfigurasi di server.");
        // Request directly from the button gesture, before awaiting other work (iOS).
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error(
            "Izin notifikasi belum diberikan. Ubah izin situs di pengaturan browser, lalu coba lagi.",
          );
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const registration = await navigator.serviceWorker.ready;
        const key = Uint8Array.from(
          atob(data.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        );
        const sub =
          (await registration.pushManager.getSubscription()) ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          }));
        await activityRequest("push/subscribe", { subscription: sub.toJSON() });
        setPushOn(true);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Notifikasi belum berhasil diaktifkan.",
      );
    } finally {
      setPushBusy(false);
    }
  }
  return { data, error, refresh, pushOn, pushBusy, togglePush };
}
export type Activity = ReturnType<typeof useActivity>;

export function NotificationSettings({ activity }: { activity: Activity }) {
  return (
    <View style={{ gap: 12 }}>
      <Label>Notifikasi status pasangan</Label>
      <Body>
        {activity.pushOn
          ? "Aktif di perangkat ini. Kabar masuk meski halaman ditutup."
          : "Dapatkan notifikasi ponsel saat pasangan mengirim status baru."}
      </Body>
      <Button
        secondary
        disabled={activity.pushBusy || !activity.data}
        onPress={activity.togglePush}
      >
        {activity.pushBusy
          ? "Memproses notifikasi…"
          : activity.pushOn
            ? "Matikan notifikasi ponsel"
            : "Aktifkan notifikasi ponsel"}
      </Button>
      {activity.data && !activity.data.pushEnabled && (
        <Body>
          Notifikasi ponsel menunggu konfigurasi server. Status tetap tersimpan
          dan bisa dibaca di sini.
        </Body>
      )}
      <Body style={{ fontSize: 11 }}>
        iPhone: bagikan situs → Tambahkan ke Layar Utama, lalu buka aplikasinya
        dan aktifkan notifikasi. Gunakan alamat HTTPS untuk akses dari ponsel.
        Masuk kembali setelah sesi akun berakhir.
      </Body>
      {!!activity.error && (
        <Body style={{ color: "#a64d50" }}>{activity.error}</Body>
      )}
    </View>
  );
}

export function PartnerMap({
  point,
  mapsKey,
}: {
  point: Checkin | undefined;
  mapsKey?: string | null;
}) {
  if (!point)
    return (
      <View
        style={{
          padding: 28,
          gap: 12,
          backgroundColor: "#f1f3eb",
          borderRadius: 16,
        }}
      >
        <Title style={{ fontSize: 23 }}>Belum ada lokasi dibagikan</Title>
        <Body>
          Lokasi muncul setelah pasangan memilih membagikan titik GPS mereka.
        </Body>
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      {mapsKey &&
        Platform.OS === "web" &&
        React.createElement("iframe", {
          title: "Lokasi pasangan di Google Maps",
          width: "100%",
          height: 300,
          style: { border: 0, borderRadius: 16 },
          loading: "lazy",
          referrerPolicy: "strict-origin-when-cross-origin",
          allowFullScreen: true,
          src: `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsKey)}&q=${encodeURIComponent(`${point.latitude},${point.longitude}`)}&zoom=17`,
        })}
      <Label>{point.label || "Lokasi yang dibagikan"}</Label>
      <Body>
        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} · akurasi ±
        {Math.round(point.accuracy)} m
      </Body>
      <Body style={{ fontSize: 11 }}>
        Diambil {when(point.captured)} · check-in terakhir, bukan lokasi
        langsung
      </Body>
      <Button
        secondary
        onPress={() => {
          void Linking.openURL(mapsUrl(point));
        }}
      >
        Buka titik di Google Maps
      </Button>
    </View>
  );
}

export function LocationScreen({
  account,
  activity,
}: {
  account: Account;
  activity: Activity;
}) {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [draft, setDraft] = useState<Omit<Checkin, "id" | "created"> | null>(
    null,
  );
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const pendingStatus = useRef<{ id: string; text: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const locations = activity.data?.partner || [];
  const selected = locations.find((p) => p.id === selectedId) || locations[0];
  async function run(action: string, task: () => Promise<void>) {
    setBusy(action);
    setFeedback("");
    try {
      await task();
    } catch (e) {
      if (mounted.current)
        setFeedback(
          e instanceof Error ? e.message : "Belum berhasil. Coba lagi.",
        );
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  function capture() {
    void run("gps", async () => {
      if (
        Platform.OS !== "web" ||
        !navigator.geolocation ||
        !window.isSecureContext
      )
        throw new Error(
          "Buka aplikasi web melalui HTTPS untuk membagikan lokasi.",
        );
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            resolve,
            (e) =>
              reject(
                new Error(
                  e.code === 1
                    ? "Izin lokasi ditolak. Izinkan lokasi pada pengaturan browser lalu coba lagi."
                    : e.code === 3
                      ? "GPS terlalu lama merespons. Coba lagi di tempat terbuka."
                      : "Lokasi belum tersedia. Periksa GPS perangkat.",
                ),
              ),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
          ),
      );
      if (mounted.current)
        setDraft({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          captured: position.timestamp,
          label: "",
        });
    });
  }
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Title>Dekat, meski berjarak.</Title>
        <Body>Bagikan tempat dan kabar, saat kamu ingin.</Body>
        <Badge>Google Maps · check-in dengan izin</Badge>
      </View>
      {!activity.data && (
        <Card>
          <Body>{activity.error || "Memuat kabar kalian…"}</Body>
          <Button secondary onPress={activity.refresh}>
            Coba lagi
          </Button>
        </Card>
      )}
      <Card>
        <Title style={{ fontSize: 24, marginBottom: 18 }}>
          Tempat terakhir {account.partner}
        </Title>
        <PartnerMap point={selected} mapsKey={activity.data?.mapsKey} />
      </Card>
      <Card>
        <Title style={{ fontSize: 24 }}>Bagikan lokasimu</Title>
        <Body style={{ marginVertical: 12 }}>
          Ambil titik GPS, periksa akurasinya, lalu bagikan ke {account.partner}
          . Lokasi hanya diambil saat kamu menekan tombol.
        </Body>
        <Field
          label="Nama tempat (opsional)"
          value={label}
          onChangeText={setLabel}
          placeholder="Misalnya: kedai kopi dekat kampus"
        />
        <Button secondary disabled={!!busy} onPress={capture}>
          {busy === "gps" ? "Mengambil titik GPS…" : "Ambil lokasi saya"}
        </Button>
        {draft && (
          <View style={{ gap: 12, marginTop: 16 }}>
            <Body>
              Titik siap dibagikan: {draft.latitude.toFixed(6)},{" "}
              {draft.longitude.toFixed(6)} · ±{Math.round(draft.accuracy)} m
            </Body>
            <Body style={{ fontSize: 11 }}>
              GPS memperkirakan posisi; periksa pin jika akurasinya rendah.
            </Body>
            <Button
              disabled={!!busy}
              onPress={() => {
                void run("location", async () => {
                  await activityRequest("location", { ...draft, label });
                  setDraft(null);
                  setFeedback("Lokasimu sudah dibagikan.");
                  await activity.refresh();
                });
              }}
            >
              Bagikan titik ini ke pasangan
            </Button>
            <Button secondary disabled={!!busy} onPress={() => setDraft(null)}>
              Batalkan titik
            </Button>
          </View>
        )}
        {!!activity.data?.mine.length && (
          <View style={{ gap: 12, marginTop: 18 }}>
            <Body>
              Lokasimu dibagikan terakhir:{" "}
              {when(activity.data.mine[0].captured)}
            </Body>
            <Button
              secondary
              disabled={!!busy}
              onPress={() => {
                void run("clear", async () => {
                  await activityRequest("location/clear", {});
                  setDraft(null);
                  await activity.refresh();
                  setFeedback("Semua lokasi yang kamu bagikan sudah dihapus.");
                });
              }}
            >
              Hapus lokasi saya dari pasangan
            </Button>
          </View>
        )}
      </Card>
      <Card>
        <Title style={{ fontSize: 24 }}>Kirim kabar hari ini</Title>
        <Body style={{ marginVertical: 12 }}>
          Status tersimpan untuk kalian berdua. Pasangan yang mengaktifkan
          notifikasi akan menerima kabar.
        </Body>
        <Field
          label="Status kamu"
          value={text}
          onChangeText={setText}
          placeholder="Sudah sampai. Lagi istirahat sebentar 🤍"
          multiline
        />
        <Body style={{ fontSize: 11, marginBottom: 12 }}>
          {text.length}/500 karakter
        </Body>
        <Button
          disabled={!!busy || !text.trim() || text.length > 500}
          onPress={() => {
            void run("status", async () => {
              if (!pendingStatus.current || pendingStatus.current.text !== text)
                pendingStatus.current = {
                  text,
                  id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
                };
              await activityRequest("status", pendingStatus.current);
              pendingStatus.current = null;
              setText("");
              setFeedback("Status terkirim.");
              await activity.refresh();
            });
          }}
        >
          {busy === "status" ? "Mengirim status…" : "Kirim status ke pasangan"}
        </Button>
      </Card>
      {!!feedback && (
        <View accessibilityRole="alert">
          <Body style={{ color: "#985f66" }}>{feedback}</Body>
        </View>
      )}
      <Card>
        <NotificationSettings activity={activity} />
      </Card>
      <Card>
        <Title style={{ fontSize: 24, marginBottom: 12 }}>Kabar terbaru</Title>
        {!activity.data?.statuses.length && (
          <Body>Belum ada status. Mulai dengan kabar kecil hari ini.</Body>
        )}
        {activity.data?.statuses.map((status) => (
          <View
            key={status.id}
            style={{
              gap: 8,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#eee5df",
            }}
          >
            <Label>
              {status.username === account.username ? "Kamu" : account.partner}{" "}
              · {when(status.created)}
            </Label>
            <Body>{status.text}</Body>
          </View>
        ))}
      </Card>
      <Card>
        <Title style={{ fontSize: 24, marginBottom: 12 }}>
          Tempat yang dibagikan {account.partner}
        </Title>
        <Body>
          Hingga 30 check-in terakhir. Riwayat ini hanya berisi tempat yang
          sengaja dibagikan.
        </Body>
        {locations.map((p) => (
          <View key={p.id} style={{ gap: 8, paddingVertical: 14 }}>
            <Label>
              {p.label || "Titik GPS"} · {when(p.captured)}
            </Label>
            <Button small secondary onPress={() => setSelectedId(p.id)}>
              {selected?.id === p.id
                ? "Titik sedang dipilih"
                : "Lihat titik ini"}
            </Button>
          </View>
        ))}
      </Card>
    </View>
  );
}
