import React from "react";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

export const petSpecies = ["Rubah", "Kucing", "Beruang", "Hiu"] as const;
export type PetSpecies = (typeof petSpecies)[number];

export function PetArt({
  species = "Kucing",
  size = 170,
  happy = false,
}: {
  species?: PetSpecies;
  size?: number;
  happy?: boolean;
}) {
  const fox = species === "Rubah";
  const bear = species === "Beruang";
  const shark = species === "Hiu";
  const coat = shark
    ? "#8EBECD"
    : fox
      ? "#E7A16E"
      : bear
        ? "#BA9179"
        : "#E5C297";
  const shade = shark
    ? "#6C9FAF"
    : fox
      ? "#C77F53"
      : bear
        ? "#98715B"
        : "#C59C72";
  const cream = shark ? "#E9F4F2" : "#FFF0D9";
  const ink = "#5B4943";
  return (
    <Svg
      width={size}
      height={size * 0.86}
      viewBox="0 0 240 205"
      accessibilityLabel={`${species} kecil yang ramah${happy ? " dan gembira" : ""}`}
    >
      <Ellipse cx="120" cy="190" rx="76" ry="9" fill="#DCCCBD" opacity={0.3} />
      <Circle cx="34" cy="80" r="4" fill="#E8D3C7" />
      <Circle cx="205" cy="56" r="3" fill="#D6E1D4" />
      <Path d="m204 111 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#E8CF9D" />

      {fox && (
        <>
          <Path
            d="M159 169c24 22 66-4 49-61-3-10-8-12-11 0-5 18-38 15-44 40Z"
            fill={coat}
          />
          <Path
            d="M196 112c3-8 4-12 7-13 9 13 10 28 9 40l-12-4-7-13Z"
            fill={cream}
          />
        </>
      )}
      {!fox && !bear && !shark && (
        <Path
          d="M163 166c48 20 57-36 34-35-15 1-12 16-4 14"
          fill="none"
          stroke={shade}
          strokeWidth="16"
          strokeLinecap="round"
        />
      )}
      {bear && <Circle cx="172" cy="157" r="16" fill={shade} />}
      {shark && (
        <>
          <Path d="M106 69c-8-20 10-45 17-43 7 2 1 18 28 37Z" fill={shade} />
          <Path
            d="M173 145c20-6 33-16 37-10 4 7-6 18-13 22 12 4 17 13 11 16-8 5-29-3-40-12Z"
            fill={shade}
          />
          <Path
            d="M72 121c-18 5-34 31-25 35 7 4 28-4 40-16M164 120c18 2 31 22 26 29-5 6-24-4-34-13"
            fill={coat}
          />
        </>
      )}
      <Ellipse cx="120" cy="151" rx={shark ? 58 : 49} ry="38" fill={coat} />
      <Ellipse cx="120" cy="155" rx="31" ry="29" fill={cream} />
      {!shark && (
        <>
          <Ellipse
            cx="80"
            cy="152"
            rx="13"
            ry="22"
            fill={coat}
            rotation="-18"
            origin="80,152"
          />
          <Ellipse
            cx="160"
            cy="152"
            rx="13"
            ry="22"
            fill={coat}
            rotation="18"
            origin="160,152"
          />
          <Ellipse cx="87" cy="182" rx="22" ry="12" fill={coat} />
          <Ellipse cx="153" cy="182" rx="22" ry="12" fill={coat} />
          <Ellipse cx="87" cy="184" rx="11" ry="5" fill={cream} opacity={0.7} />
          <Ellipse
            cx="153"
            cy="184"
            rx="11"
            ry="5"
            fill={cream}
            opacity={0.7}
          />
        </>
      )}
      {bear ? (
        <>
          <Circle cx="72" cy="59" r="24" fill={coat} />
          <Circle cx="168" cy="59" r="24" fill={coat} />
          <Circle cx="72" cy="59" r="13" fill="#E3B2A3" />
          <Circle cx="168" cy="59" r="13" fill="#E3B2A3" />
        </>
      ) : (
        !shark && (
          <>
            <Path
              d={
                fox
                  ? "M57 86 58 29Q60 18 70 27l40 35M132 61l39-34q10-8 11 3l1 56Z"
                  : "M62 86 64 35q1-9 9-3l36 32M132 64l34-32q8-6 9 3l3 51Z"
              }
              fill={coat}
            />
            <Path d="m70 65 1-23 22 23m54 0 21-23 1 24Z" fill="#E8B4A7" />
          </>
        )
      )}
      <Ellipse cx="120" cy="99" rx={shark ? 64 : 62} ry="49" fill={coat} />
      {fox && (
        <Path
          d="M59 96q31-5 61 20 30-25 61-20-3 45-61 48-57-4-61-48Z"
          fill={cream}
        />
      )}
      {bear && <Ellipse cx="120" cy="119" rx="25" ry="18" fill={cream} />}
      {shark && (
        <Path d="M64 113q56 25 112 0-12 38-56 39-45-2-56-39Z" fill={cream} />
      )}
      {!fox && !bear && !shark && (
        <Path
          d="m107 56 4 13m9-16v14m13-11-4 13"
          stroke={shade}
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      <Ellipse cx="80" cy="113" rx="11" ry="6" fill="#E8A8A2" opacity={0.8} />
      <Ellipse cx="160" cy="113" rx="11" ry="6" fill="#E8A8A2" opacity={0.8} />
      {happy ? (
        <Path
          d="M88 100q7-10 14 0m36 0q7-10 14 0"
          fill="none"
          stroke={ink}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : (
        <G>
          <Ellipse cx="95" cy="100" rx="5" ry="6.5" fill={ink} />
          <Ellipse cx="145" cy="100" rx="5" ry="6.5" fill={ink} />
          <Circle cx="93.5" cy="98" r="1.7" fill="white" />
          <Circle cx="143.5" cy="98" r="1.7" fill="white" />
        </G>
      )}
      {shark ? (
        <>
          <Path
            d="M110 117q10 12 20 0"
            fill="none"
            stroke={ink}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <Path
            d="m65 109-2 7m8-4-1 7m104-10 2 7m-8-4 1 7"
            fill="none"
            stroke={shade}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Path
            d="M114 111q6-3 12 0 0 4-6 7-6-3-6-7Z"
            fill={bear ? ink : "#AD7B75"}
          />
          <Path
            d="M120 118v3m0 0q-6 7-11 0m11 0q6 7 11 0"
            fill="none"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {!fox && !bear && !shark && (
        <Path
          d="m73 116-17-3m18 10-17 3m110-10 17-3m-18 10 17 3"
          stroke={shade}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
      <Path
        d="M120 161c-15-10-14-20-7-20 4 0 7 4 7 4s3-4 7-4c7 0 8 10-7 20Z"
        fill={shark ? "#A6CDD0" : "#DEADA0"}
      />
    </Svg>
  );
}
