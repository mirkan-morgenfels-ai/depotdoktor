import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 75% 15%, #16273f 0%, #0b1626 70%)",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 5 59 32 32 59 5 32Z" fill="none" stroke="#c9a548" strokeWidth="2" />
          <path
            d="M17.5 38.5 24.5 31.6 29.6 34.8 36.6 26.8 40.4 29 44.5 24.3"
            fill="none"
            stroke="#d8bd72"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="44.5" cy="24.3" r="2.2" fill="#d8bd72" />
        </svg>
      </div>
    ),
    size,
  );
}
