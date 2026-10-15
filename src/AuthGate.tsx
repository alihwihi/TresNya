import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Avatar, Icon } from "./art";
import { Body, Button, Card, Field, Title, colors, s, serif } from "./ui";

export type Account = {
  username: string;
  name: string;
  gender: "male" | "female";
  partner: string;
};
const origin =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.location.port === "8081"
    ? `${window.location.protocol}//${window.location.hostname}:4173`
    : "";
async function request(route: string, data?: object) {
  const response = await fetch(`${origin}/api/auth/${route}`, {
    method: data ? "POST" : "GET",
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  }).catch(() => {
    throw new Error(
      "Server belum dapat dihubungi. Periksa koneksi internet lalu coba lagi.",
    );
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "Server login belum tersedia. Pemilik aplikasi perlu deploy API ke Vercel bersama kode terbaru."
        : "Server tidak memberikan respons yang valid. Coba lagi atau periksa log deployment.",
    );
  }
  const payload = await response.json();
  return { response, payload };
}
export function AuthGate({
  children,
}: {
  children: (account: Account, logout: () => Promise<void>) => React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function check() {
    try {
      const { response, payload } = await request("me");
      if (response.ok) {
        setAccount(payload.user);
        setError("");
      } else if (response.status === 401) setAccount(null);
      else throw new Error(payload.error || "Server belum siap. Coba lagi.");
    } catch (cause) {
      setAccount(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Server belum dapat dihubungi. Coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void check();
    const timer = setInterval(() => {
      void check();
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  async function login() {
    setError("");
    if (!username.trim() || !password) {
      setError("Isi nama pengguna dan kata sandi.");
      return;
    }
    setBusy(true);
    try {
      const { response, payload } = await request("login", {
        username,
        password,
      });
      if (!response.ok) setError(payload.error);
      else {
        setPassword("");
        setAccount(payload.user);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Server belum dapat dihubungi. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setError("");
    try {
      const { response } = await request("logout", {});
      if (!response.ok) throw new Error();
      setAccount(null);
      setUsername("");
      setPassword("");
    } catch {
      setError(
        "Belum berhasil keluar. Periksa koneksi ke server, lalu coba lagi.",
      );
    }
  }
  if (account)
    return (
      <View style={{ flex: 1 }}>
        {children(account, logout)}
        {!!error && (
          <View
            accessibilityRole="alert"
            style={{ padding: 15, backgroundColor: "#fae7e4" }}
          >
            <Body>{error}</Body>
          </View>
        )}
      </View>
    );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cream }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: "100%", maxWidth: 450, gap: 22 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Icon name="heart" size={34} color={colors.rose} />
          <Text style={{ fontFamily: serif, fontSize: 42, color: colors.ink }}>
            TresNya
          </Text>
          <Body>Satu ruang. Dua hati. Alih & Nana.</Body>
        </View>
        <Card style={{ padding: width < 400 ? 22 : 30 }}>
          <Title style={{ fontSize: 27 }}>Pulang ke ruang kita.</Title>
          <Body style={{ marginTop: 8, marginBottom: 22 }}>
            Masuk dengan akun pribadimu.
          </Body>
          <View style={[s.row, { justifyContent: "center", marginBottom: 25 }]}>
            <Avatar size={45} />
            <Icon name="heart" size={17} color={colors.rose} />
            <Avatar girl size={45} />
          </View>
          {loading ? (
            <Body>Memeriksa sesi…</Body>
          ) : (
            <>
              <Field
                label="Nama pengguna"
                value={username}
                onChangeText={setUsername}
                placeholder="alih atau nana"
              />
              <Field
                label="Kata sandi"
                value={password}
                onChangeText={setPassword}
                secure
              />
              <Button onPress={login} disabled={busy}>
                {busy ? "Sedang masuk…" : "Masuk ke TresNya"}
              </Button>
            </>
          )}
          {!!error && (
            <View accessibilityRole="alert" style={{ marginTop: 18, gap: 12 }}>
              <Body style={{ color: "#a64d50" }}>{error}</Body>
              {!!error && (
                <Button secondary onPress={check}>
                  Coba hubungkan lagi
                </Button>
              )}
            </View>
          )}
          <Body style={{ fontSize: 11, marginTop: 21, textAlign: "center" }}>
            Ruang pribadi untuk dua akun terdaftar.
          </Body>
        </Card>
      </View>
    </ScrollView>
  );
}
