import React, { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { LivePoint } from "./useLiveLocation";

export function LiveMap({ points }: { points: LivePoint[] }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const markers = useRef(
    new Map<
      string,
      { marker: Leaflet.Marker; circle: Leaflet.Circle; photo: string | null }
    >(),
  );
  const [ready, setReady] = useState(0);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(true);
  const latest = useRef(points);
  latest.current = points;
  const placed = points.filter(
    (p) => p.latitude !== null && p.longitude !== null,
  );
  const hasPoints = placed.length > 0;
  useEffect(() => {
    if (!hasPoints) return;
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    import("leaflet")
      .then((L) => {
        if (cancelled || !host.current) return;
        lib.current = L;
        const initial = latest.current.find(
          (p) => p.latitude !== null && p.longitude !== null,
        )!;
        const instance = L.map(host.current, {
          scrollWheelZoom: false,
        }).setView([initial.latitude!, initial.longitude!], 16);
        map.current = instance;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
          .on("tileerror", () => {
            if (!cancelled)
              setError(
                "Latar peta belum termuat. Posisi dan tautan Google Maps tetap tersedia.",
              );
          })
          .addTo(instance);
        resize = new ResizeObserver(() => instance.invalidateSize());
        resize.observe(host.current);
        setReady((v) => v + 1);
      })
      .catch(() =>
        setError("Peta belum bisa dimuat. Coba muat ulang halaman."),
      );
    return () => {
      cancelled = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
  }, [hasPoints]);
  useEffect(() => {
    const L = lib.current,
      m = map.current;
    if (!L || !m) return;
    const names = new Set(placed.map((p) => p.username));
    markers.current.forEach((entry, name) => {
      if (!names.has(name)) {
        entry.marker.remove();
        entry.circle.remove();
        markers.current.delete(name);
      }
    });
    const createIcon = (p: LivePoint) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:44px;height:44px;border:3px solid white;border-radius:50%;background:#ad7277;box-shadow:0 2px 10px #0005;display:flex;align-items:center;justify-content:center;color:white;font:bold 20px sans-serif;overflow:hidden";
      if (p.photo) {
        const img = document.createElement("img");
        img.src = p.photo;
        img.alt = `Foto profil ${p.username === "alih" ? "Alih" : "Nana"}`;
        img.style.cssText = "width:100%;height:100%;object-fit:cover";
        el.appendChild(img);
      } else el.textContent = p.username === "alih" ? "A" : "N";
      return L.divIcon({
        html: el,
        className: "tresnya-live-marker",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
    };
    placed.forEach((p) => {
      const coord: Leaflet.LatLngExpression = [p.latitude!, p.longitude!];
      let entry = markers.current.get(p.username);
      if (!entry) {
        const marker = L.marker(coord, {
          icon: createIcon(p),
          title: `Lokasi live ${p.username}`,
          alt: `Lokasi live ${p.username}`,
        }).addTo(m);
        const circle = L.circle(coord, {
          radius: p.accuracy || 0,
          color: "#ad7277",
          weight: 1,
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(m);
        entry = { marker, circle, photo: p.photo };
        markers.current.set(p.username, entry);
      } else {
        entry.marker.setLatLng(coord);
        entry.circle.setLatLng(coord).setRadius(p.accuracy || 0);
        if (entry.photo !== p.photo) {
          entry.marker.setIcon(createIcon(p));
          entry.photo = p.photo;
        }
      }
      const node = entry.marker.getElement();
      if (node) {
        node.dataset.username = p.username;
        node.dataset.latitude = String(p.latitude);
        node.dataset.longitude = String(p.longitude);
      }
    });
    if (
      following &&
      placed.length &&
      placed.some(
        (p) => !m.getBounds().pad(-0.15).contains([p.latitude!, p.longitude!]),
      )
    ) {
      m.fitBounds(
        L.latLngBounds(placed.map((p) => [p.latitude!, p.longitude!])),
        {
          padding: [55, 55],
          maxZoom: 17,
          animate: !window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        },
      );
    }
  }, [points, ready, following]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>
        {
          ".tresnya-live-marker{transition:transform 0.8s linear}.leaflet-container{font-family:system-ui,sans-serif}@media(prefers-reduced-motion:reduce){.tresnya-live-marker{transition:none}}"
        }
      </style>
      {hasPoints ? (
        <>
          <div
            ref={host}
            role="region"
            aria-label="Peta lokasi live kalian"
            style={{
              height: 320,
              width: "100%",
              borderRadius: 16,
              overflow: "hidden",
              isolation: "isolate",
              background: "#eeeae3",
            }}
          />
          <button
            aria-pressed={following}
            onClick={() => {
              setFollowing(!following);
              const L = lib.current,
                m = map.current;
              if (L && m)
                m.fitBounds(
                  L.latLngBounds(
                    placed.map((p) => [p.latitude!, p.longitude!]),
                  ),
                  { padding: [55, 55], maxZoom: 17 },
                );
            }}
            style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              border: "1px solid #ede8e1",
              borderRadius: 10,
              background: "#fffdfa",
              color: "#443c37",
              cursor: "pointer",
            }}
          >
            {following
              ? "Ikuti pergerakan: aktif"
              : "Ikuti pergerakan: nonaktif"}
          </button>
        </>
      ) : (
        <p style={{ color: "#918780", margin: 0 }}>
          Belum ada posisi live. Mulai berbagi untuk menampilkan penanda kalian.
        </p>
      )}
      {!!error && (
        <p role="status" style={{ fontSize: 12, color: "#985f66" }}>
          {error}
        </p>
      )}
    </div>
  );
}
