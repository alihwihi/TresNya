import React from "react";
import { avatarSvg } from "./avatarSvg";
import Svg, {
  Path,
  Circle,
  Rect,
  Ellipse,
  G,
  Line,
  Text as SvgText,
  SvgXml,
} from "react-native-svg";

export type IconName =
  | "home"
  | "pin"
  | "heart"
  | "game"
  | "spark"
  | "paw"
  | "settings"
  | "bell"
  | "arrow"
  | "plus"
  | "close"
  | "battery"
  | "clock"
  | "calendar"
  | "image"
  | "send"
  | "check"
  | "shield"
  | "logout"
  | "moon"
  | "coffee"
  | "gift"
  | "chevron"
  | "pencil";
const paths: Record<IconName, string> = {
  pencil: "m16 3 5 5M3 21l5-1L21 7a2.1 2.1 0 0 0-5-5L3 15ZM3 15l5 5",
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  pin: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  game: "M7 7h10c3 0 4 3 5 9 .4 3-2 4-4 2l-2-2H8l-2 2c-2 2-4.4 1-4-2 1-6 2-9 5-9ZM7 10v5M4.5 12.5h5M16 11h.01M19 14h.01",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4M18 4h4",
  paw: "M8 13c-2 3-5 4-3 7 2 2 5-1 7-1s5 3 7 1c2-3-1-4-3-7-2-3-6-3-8 0ZM5 5a2 3 0 1 0 0 6 2 3 0 0 0 0-6ZM10 2a2 3 0 1 0 0 6 2 3 0 0 0 0-6ZM16 2a2 3 0 1 0 0 6 2 3 0 0 0 0-6ZM21 6a2 3 0 1 0 0 6 2 3 0 0 0 0-6",
  settings:
    "m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M9 21h6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  battery: "M3 6h15v12H3ZM21 10v4M6 9v6M9 9v6M12 9v6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2",
  calendar: "M4 5h16v16H4ZM8 2v6M16 2v6M4 11h16M8 15h2M14 15h2",
  image: "M3 3h18v18H3ZM3 17l6-6 5 5 3-3 4 4M16 7h.01",
  send: "m22 2-7 20-4-9-9-4ZM22 2 11 13",
  check: "m5 12 4 4L19 6",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 12l3 3 5-6",
  logout: "M10 3H4v18h6M9 12h12m-4-4 4 4-4 4",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11",
  coffee:
    "M3 8h13v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM16 8h2a3 3 0 0 1 0 6h-2M6 2v3M10 2v3M14 2v3",
  gift: "M3 8h18v5H3ZM5 13v8h14v-8M12 8v13M12 8C1 8 5-2 12 8Zm0 0c11 0 7-10 0 0",
  chevron: "m9 5 7 7-7 7",
};
export function Icon({
  name,
  size = 21,
  color = "#786d68",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function Avatar({
  girl = false,
  size = 44,
}: {
  girl?: boolean;
  size?: number;
}) {
  return <SvgXml xml={avatarSvg(girl)} width={size} height={size} />;
}
export { PetArt } from "./PetArt";
export function LoveArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 410 260">
      <Circle cx="231" cy="142" r="100" fill="#ead5cc" opacity=".6" />
      <Path
        d="M36 180c41-88 104 58 178-68S357 85 380 28"
        stroke="#ca9e92"
        strokeWidth="1.5"
        strokeDasharray="5 7"
        fill="none"
      />
      <G rotation="-13" origin="160,143">
        <Rect x="83" y="62" width="135" height="165" rx="5" fill="#fffcf6" />
        <Rect x="94" y="73" width="113" height="116" fill="#d1d9c6" />
        <Circle cx="177" cy="99" r="14" fill="#f1e6c9" />
        <Path d="M94 168q35-77 71-22l42-27v70H94" fill="#a3b49a" />
        <Path d="M94 183q53-49 113-21v27H94" fill="#839d82" />
        <SvgText
          x="112"
          y="211"
          fill="#867468"
          fontSize="13"
          fontFamily="Georgia"
        >
          our little forever.
        </SvgText>
      </G>
      <G rotation="12" origin="282,158">
        <Rect
          x="221"
          y="100"
          width="124"
          height="99"
          rx="8"
          fill="#faf1df"
          stroke="#c3a991"
          strokeWidth="1.2"
        />
        <Path
          d="m222 105 61 49 61-49m-123 92 46-42m77 42-45-42"
          fill="none"
          stroke="#c3a991"
          strokeWidth="1.2"
        />
        <Path d="M282 139c-16-17-33 7 0 24 33-17 16-41 0-24" fill="#b57071" />
      </G>
      <Path d="M274 47c-10-14-27 0 0 19 27-19 10-33 0-19" fill="#be8082" />
      <Path d="M67 108c-7-10-19 0 0 13 19-13 7-23 0-13" fill="#be8082" />
      <Path d="m348 191 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#bd9b72" />
      <Path
        d="m219 46 4-10m-11 10-3-8m18 16 9-2"
        stroke="#b28d72"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
export function MapArt({ large = false }: { large?: boolean }) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={large ? "0 0 700 400" : "0 35 700 290"}
      preserveAspectRatio="xMidYMid slice"
    >
      <Rect width="700" height="400" fill="#f0efe5" />
      <G fill="#dfe5d6">
        <Path d="M0 0h210l-30 76-92 31L0 83ZM399 0h180l-35 106-87 9-39-66ZM0 249l85-18 65 94-17 75H0ZM384 203l83-31 68 58-34 86-103-26ZM581 256l119-47v191H581Z" />
      </G>
      <Path
        d="M-10 143C118 119 87 186 225 153s151-50 196 2 125 85 299 9"
        stroke="#ccdfdf"
        strokeWidth="23"
        fill="none"
      />
      <G stroke="#fffdf8" strokeWidth="13" fill="none">
        <Path d="M0 59 700 323M0 294 700 44M156 0l113 400M497 0 386 400M50 0l90 400M620 0 585 400M0 220l700 50" />
      </G>
      <G stroke="#d8d4c5" strokeWidth="1" fill="none">
        <Path d="M0 59 700 323M0 294 700 44M156 0l113 400M497 0 386 400M50 0l90 400M620 0 585 400M0 220l700 50" />
      </G>
      <Path
        d={
          large
            ? "M193 133c113 7 112 119 290 105"
            : "M193 133c113 7 112 65 290 55"
        }
        stroke="#b47779"
        strokeWidth="3"
        strokeDasharray="6 7"
        fill="none"
      />
      <Circle cx="193" cy="133" r="28" fill="#a0b198" opacity=".22" />
      <Circle
        cx="193"
        cy="133"
        r="14"
        fill="#83977a"
        stroke="white"
        strokeWidth="4"
      />
      <Circle
        cx="483"
        cy={large ? 238 : 188}
        r="32"
        fill="#bc8588"
        opacity=".2"
      />
      <Circle
        cx="483"
        cy={large ? 238 : 188}
        r="16"
        fill="#b47779"
        stroke="white"
        strokeWidth="4"
      />
      <G fill="#888b7f" fontSize="12" fontFamily="sans-serif">
        <SvgText x="148" y={large ? 91 : 111}>
          JAKARTA
        </SvgText>
        <SvgText x="451" y={large ? 284 : 219}>
          BANDUNG
        </SvgText>
        <SvgText x="313" y="332">
          JAWA BARAT
        </SvgText>
        <SvgText x="316" y="54">
          Bekasi
        </SvgText>
      </G>
      <Rect x="269" y="162" width="108" height="32" rx="16" fill="#fffdf9" />
      <SvgText
        x="286"
        y="183"
        fill="#86615f"
        fontSize="12"
        fontFamily="sans-serif"
      >
        ♡ 118 km
      </SvgText>
    </Svg>
  );
}
