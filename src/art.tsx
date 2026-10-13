import React from "react";
import Svg, {
  Path,
  Circle,
  Rect,
  Ellipse,
  G,
  Line,
  Text as SvgText,
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
  | "chevron";
const paths: Record<IconName, string> = {
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
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="32" fill={girl ? "#ebdcd1" : "#dfe5d8"} />
      <Path
        d={
          girl
            ? "M12 58V30C12 3 52 3 52 30v28Z"
            : "M17 34V22C17 4 49 4 49 22v12Z"
        }
        fill="#57453b"
      />
      <Path d="M10 64c0-25 44-25 44 0" fill={girl ? "#ac6c69" : "#7c8d78"} />
      <Rect x="27" y="39" width="10" height="12" rx="4" fill="#e7ba9c" />
      <Ellipse cx="32" cy="29" rx="14" ry="17" fill="#f0c6a9" />
      <Path
        d={
          girl
            ? "M17 28c0-21 26-23 30-2-12-3-15-10-15-10s-6 10-15 12"
            : "M17 25c-2-21 34-19 30-1-8 1-16-4-18-6-3 6-9 7-12 7"
        }
        fill="#57453b"
      />
      <Circle cx="26" cy="30" r="1.1" fill="#57453b" />
      <Circle cx="38" cy="30" r="1.1" fill="#57453b" />
      <Path d="M28 37q4 3 8 0" stroke="#b07567" strokeWidth="1.3" fill="none" />
    </Svg>
  );
}
export function Cat({
  size = 170,
  species = "Kucing",
  happy = false,
}: {
  size?: number;
  species?: string;
  happy?: boolean;
}) {
  const rabbit = species === "Kelinci";
  return (
    <Svg width={size} height={size * 0.86} viewBox="0 0 240 205">
      <Ellipse cx="121" cy="190" rx="79" ry="10" fill="#ddcab2" opacity=".35" />
      {rabbit ? (
        <Circle cx="177" cy="167" r="17" fill="#f8e5c9" />
      ) : (
        <Path
          d="M170 167c64 10 45-55 25-35-8 8 7 15-7 22"
          fill="none"
          stroke="#d5a878"
          strokeWidth="17"
          strokeLinecap="round"
        />
      )}
      <Ellipse cx="122" cy="151" rx="54" ry="40" fill="#e8bd8c" />
      <Ellipse cx="120" cy="155" rx="34" ry="29" fill="#f8e5c9" />
      {rabbit ? (
        <G fill="#e8bd8c" stroke="#c59365" strokeWidth="2">
          <Ellipse
            cx="83"
            cy="44"
            rx="15"
            ry="41"
            rotation="-13"
            origin="83,44"
          />
          <Ellipse
            cx="151"
            cy="44"
            rx="15"
            ry="41"
            rotation="13"
            origin="151,44"
          />
        </G>
      ) : (
        <G fill="#e8bd8c" stroke="#c59365" strokeWidth="2">
          <Path d="m64 91 3-59 43 31M136 61l37-28 4 58" />
          <Path
            d="m73 73 1-27 21 22m50 0 21-21 1 29"
            fill="#e5a8a1"
            stroke="none"
          />
        </G>
      )}
      {species === "Anjing" && (
        <G fill="#b8855a">
          <Ellipse cx="65" cy="85" rx="17" ry="34" />
          <Ellipse cx="173" cy="85" rx="17" ry="34" />
        </G>
      )}
      <Ellipse cx="119" cy="100" rx="61" ry="48" fill="#e8bd8c" />
      {!rabbit && (
        <Path
          d="m108 56 5 17m12-17-2 17m14-15-5 14"
          stroke="#c59365"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      <Ellipse cx="83" cy="113" rx="11" ry="6" fill="#e5a298" />
      <Ellipse cx="154" cy="113" rx="11" ry="6" fill="#e5a298" />
      {happy ? (
        <Path
          d="m85 99 8-5 7 5m37 0 8-5 7 5"
          stroke="#665040"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <G fill="#665040">
          <Ellipse cx="93" cy="100" rx="3.5" ry="5" />
          <Ellipse cx="145" cy="100" rx="3.5" ry="5" />
        </G>
      )}
      <Path d="m113 112 6 5 6-5Z" fill="#ad7766" />
      <Path
        d="M119 117v4m0-1q-7 9-12 0m12 0q7 9 12 0"
        fill="none"
        stroke="#84604d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="m72 113-23-4m23 12-23 3m117-11 23-4m-23 12 23 3"
        stroke="#b78d68"
        strokeWidth="1.5"
      />
      <Ellipse cx="88" cy="183" rx="22" ry="11" fill="#e8bd8c" />
      <Ellipse cx="151" cy="183" rx="22" ry="11" fill="#e8bd8c" />
      <Path
        d="M79 183v5m7-5v5m60-5v5m7-5v5"
        stroke="#c59365"
        strokeWidth="1.5"
      />
    </Svg>
  );
}
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
        d={large ? "M193 133c113 7 112 119 290 105" : "M193 133c113 7 112 65 290 55"}
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
      <Circle cx="483" cy={large ? 238 : 188} r="32" fill="#bc8588" opacity=".2" />
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
