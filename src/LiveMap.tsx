import React from "react";
import { Body } from "./ui";
import { LivePoint } from "./useLiveLocation";
export function LiveMap({ points }: { points: LivePoint[] }) {
  return (
    <Body>
      Peta live tersedia di aplikasi web. {points.length} posisi dibagikan.
    </Body>
  );
}
