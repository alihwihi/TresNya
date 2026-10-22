import React, { useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Constants from "expo-constants";
import type { LivePoint } from "./useLiveLocation";
import { Body, Button } from "./ui";
import { Avatar } from "./art";

function ProfileMarker({ point }: { point: LivePoint }) {
  const marker = useRef<React.ElementRef<typeof Marker>>(null);
  useEffect(() => {
    marker.current?.animateMarkerToCoordinate(
      { latitude: point.latitude!, longitude: point.longitude! },
      1000,
    );
  }, [point.latitude, point.longitude]);
  return (
    <Marker
      ref={marker}
      coordinate={{ latitude: point.latitude!, longitude: point.longitude! }}
      title={point.username === "alih" ? "Alih" : "Nana"}
      description={`Akurasi ±${Math.round(point.accuracy || 0)} m`}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#f4e6dc",
          borderWidth: 3,
          borderColor: "#A16C74",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {point.photo ? (
          <Image
            key={point.photo}
            source={{ uri: point.photo }}
            accessibilityLabel={`Foto profil ${point.username === "alih" ? "Alih" : "Nana"}`}
            onLoad={() => marker.current?.redraw()}
            style={{ width: 42, height: 42, borderRadius: 21 }}
          />
        ) : (
          <Avatar girl={point.username === "nana"} size={42} />
        )}
      </View>
    </Marker>
  );
}
export function LiveMap({ points }: { points: LivePoint[] }) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false),
    [follow, setFollow] = useState(true);
  const positions = points.filter(
    (p) => p.latitude !== null && p.longitude !== null,
  );
  const coords = positions.map((p) => ({
    latitude: p.latitude!,
    longitude: p.longitude!,
  }));
  const signature = JSON.stringify(coords);
  useEffect(() => {
    if (!ready || !follow || !coords.length) return;
    if (coords.length === 1)
      map.current?.animateToRegion(
        { ...coords[0], latitudeDelta: 0.006, longitudeDelta: 0.006 },
        800,
      );
    else
      map.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
  }, [signature, ready, follow]);
  if (!Constants.expoConfig?.extra?.androidMapsConfigured)
    return (
      <Body>
        Peta di aplikasi ini belum tersedia. Gunakan tombol Buka di Google Maps
        di bawah untuk melihat posisi yang dibagikan.
      </Body>
    );
  if (!coords.length) return <Body>Menunggu posisi GPS yang dibagikan…</Body>;
  return (
    <View style={{ gap: 10 }}>
      <MapView
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={{ width: "100%", height: 320 }}
        onMapReady={() => setReady(true)}
        initialRegion={{
          ...coords[0],
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
      >
        {positions.map((point) => (
          <React.Fragment key={point.username}>
            <Circle
              center={{
                latitude: point.latitude!,
                longitude: point.longitude!,
              }}
              radius={point.accuracy || 0}
              strokeColor="#A16C74"
              fillColor="rgba(161,108,116,0.12)"
            />
            <ProfileMarker point={point} />
          </React.Fragment>
        ))}
      </MapView>
      <Button small secondary onPress={() => setFollow((value) => !value)}>
        Ikuti pergerakan: {follow ? "aktif" : "nonaktif"}
      </Button>
    </View>
  );
}
