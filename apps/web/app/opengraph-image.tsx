import { ImageResponse } from "next/og";
import { OG_GLYPHS } from "@/lib/og-glyphs";
import { OG_IMAGE_ALT, OG_IMAGE_SIZE } from "@/lib/metadata";

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

const NAVY = "#0b1626";
const IVORY = "#f7f3ea";
const GOLD = "#c9a548";
const GOLD_LIGHT = "#d8bd72";
const NAVY_300 = "#8f9bb0";

const COURSE: ReadonlyArray<readonly [number, number]> = [
  [0, 292],
  [28, 284],
  [56, 289],
  [84, 270],
  [112, 276],
  [140, 252],
  [168, 261],
  [196, 238],
  [224, 246],
  [252, 251],
  [280, 226],
  [308, 233],
  [336, 207],
  [364, 216],
  [392, 191],
  [420, 199],
  [448, 172],
  [476, 181],
  [504, 158],
  [532, 150],
  [560, 163],
  [584, 131],
  [606, 112],
];

const COURSE_PATH = COURSE.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");

function Glyphs({ id, height, top, bottom, colors }: { id: keyof typeof OG_GLYPHS; height: number; top: number; bottom: number; colors: string[] }) {
  const glyphs = OG_GLYPHS[id];
  const span = bottom - top;
  const width = Math.ceil((glyphs.width * height) / span);
  return (
    <svg width={width} height={height} viewBox={`0 ${top} ${glyphs.width} ${span}`} xmlns="http://www.w3.org/2000/svg">
      {glyphs.runs.map((d, index) => (
        <path key={index} d={d} fill={colors[index] ?? colors[0]} />
      ))}
    </svg>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: NAVY,
          backgroundImage: "radial-gradient(circle at 92% -10%, rgba(62,106,158,0.38) 0%, rgba(62,106,158,0) 55%)",
          color: IVORY,
        }}
      >
        <svg
          width="520"
          height="250"
          viewBox="0 80 640 280"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", right: 64, top: 316 }}
        >
          <defs>
            <linearGradient id="og-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={GOLD} stopOpacity="0.22" />
              <stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="og-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id="og-mask">
              <rect y="80" width="640" height="280" fill="url(#og-fade)" />
            </mask>
          </defs>
          <g mask="url(#og-mask)">
            {[72, 144, 216, 288].map((y) => (
              <line key={y} x1="0" x2="640" y1={y} y2={y} stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" strokeDasharray="2 7" />
            ))}
            <line x1="0" x2="640" y1="340" y2="340" stroke={GOLD} strokeOpacity="0.35" strokeWidth="1" />
            <path d={`${COURSE_PATH} L606 340 L0 340 Z`} fill="url(#og-fill)" />
            {[56, 44, 33, 23, 14, 6].map((offset, index) => (
              <path
                key={offset}
                d={COURSE_PATH}
                transform={`translate(0 ${offset})`}
                fill="none"
                stroke={GOLD}
                strokeOpacity={0.05 + index * 0.035}
                strokeWidth="1"
              />
            ))}
            <path d={COURSE_PATH} fill="none" stroke={GOLD_LIGHT} strokeWidth="2.25" strokeLinejoin="round" />
            <line x1="606" x2="606" y1="112" y2="340" stroke={GOLD_LIGHT} strokeOpacity="0.45" strokeDasharray="3 5" strokeWidth="1" />
          </g>
          <circle cx="606" cy="112" r="13" fill="none" stroke={GOLD_LIGHT} strokeOpacity="0.4" strokeWidth="1" />
          <circle cx="606" cy="112" r="5" fill={GOLD_LIGHT} />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "60px 76px 56px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="40" height="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 1.75 30.25 16 16 30.25 1.75 16Z" fill="none" stroke={GOLD} strokeWidth="1.4" />
              <path
                d="M8.4 19.6 12.2 15.9 15 17.6 18.8 13.3 20.9 14.5 23 12.1"
                fill="none"
                stroke={GOLD}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="23" cy="12.1" r="1.35" fill={GOLD} />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ fontSize: 16, letterSpacing: 3.2, textTransform: "uppercase", color: IVORY }}>Mirkan Deniz Günkaya</div>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: NAVY_300, marginTop: 6 }}>
                Portfolio · Daten, KI, Finanzen
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 15, letterSpacing: 3.6, textTransform: "uppercase", color: GOLD_LIGHT }}>
              <div style={{ width: 40, height: 1, backgroundColor: GOLD, marginRight: 16 }} />
              Projekt K1 · Finanzdaten
            </div>
            <div style={{ display: "flex", marginTop: 26 }}>
              <Glyphs id="title" height={150} top={-760} bottom={250} colors={[IVORY, GOLD_LIGHT]} />
            </div>
            <div style={{ display: "flex", marginTop: 14 }}>
              <Glyphs id="tagline" height={46} top={-760} bottom={250} colors={[GOLD_LIGHT]} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 540, fontSize: 19, lineHeight: 1.5, color: NAVY_300 }}>
            <div style={{ width: 56, height: 1, backgroundColor: GOLD, marginBottom: 18 }} />
            <div style={{ display: "flex" }}>Rendite, Risiko, Allokation und Vorabpauschale</div>
            <div style={{ display: "flex" }}>aus Broker-CSV-Exporten, ausgewertet im Browser.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
