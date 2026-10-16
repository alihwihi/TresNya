import React from "react";
import { Linking, View } from "react-native";
import { Account } from "./AuthGate";
import { Badge, Body, Button, Card, Title } from "./ui";
import { LiveLocation } from "./useLiveLocation";
import { LiveMap } from "./LiveMap";

export function LiveLocationCard({
  live,
  account,
}: {
  live: LiveLocation;
  account: Account;
}) {
  const points = [live.mine, live.partner].filter((p) => p !== null);
  return (
    <Card style={{ gap: 14 }}>
      <Title style={{ fontSize: 24 }}>Lokasi live kalian</Title>
      <Body>
        Bagikan posisi dan foto profilmu ke {account.partner} saat bergerak.
        Biarkan halaman aktif. Berbagi berhenti saat halaman disembunyikan atau
        ditutup, dan berakhir setelah satu jam.
      </Body>
      <Badge green={live.sharing}>
        {live.sharing
          ? "Berbagi live aktif"
          : "Berbagi live tidak aktif di perangkat ini"}
      </Badge>
      <Button
        onPress={() => {
          if (live.sharing) void live.stop();
          else void live.start();
        }}
      >
        {live.sharing ? "Hentikan berbagi live" : "Mulai berbagi lokasi live"}
      </Button>
      {!!live.message && (
        <View accessibilityLiveRegion="polite">
          <Body>{live.message}</Body>
        </View>
      )}
      {!!live.connectionError && (
        <Body style={{ color: "#a64d50" }}>{live.connectionError}</Body>
      )}
      <LiveMap points={points} />
      {points.map((p) => (
        <View key={p.username} style={{ gap: 6 }}>
          <Body>
            {p.username === account.username ? "Kamu" : account.partner} ·{" "}
            {p.captured
              ? `${Math.max(0, Math.floor((live.serverTime - p.captured) / 1000))} detik sejak GPS terakhir · ±${Math.round(p.accuracy || 0)} m`
              : "Menunggu GPS…"}
          </Body>
          {p.captured !== null && live.serverTime - p.captured > 15000 && (
            <Body style={{ color: "#985f66" }}>
              Menunggu pembaruan GPS; ini posisi terakhir, bukan posisi saat
              ini.
            </Body>
          )}
          {p.latitude !== null && p.longitude !== null && (
            <Button
              small
              secondary
              onPress={() => {
                void Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`,
                );
              }}
            >
              Buka lokasi{" "}
              {p.username === account.username ? "saya" : account.partner} di
              Google Maps
            </Button>
          )}
        </View>
      ))}
      <Body style={{ fontSize: 11 }}>
        Posisi diperbarui sekitar setiap 3 detik sesuai GPS dan koneksi.
        Lingkaran menunjukkan perkiraan akurasi. Jika koneksi terputus, penanda
        hilang maksimal 45 detik setelah kiriman terakhir.
      </Body>
    </Card>
  );
}
