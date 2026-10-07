import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#111111" }}>
        <svg width="180" height="180" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="22" fill="none" stroke="#b8912f" strokeWidth="2.5" />
          <path
            fill="#fbfaf6"
            fillRule="evenodd"
            d="M22 21H31C38.5 21 44 25.8 44 32C44 38.2 38.5 43 31 43H22ZM27 25V39H30.6C35.6 39 39 36.2 39 32C39 27.8 35.6 25 30.6 25Z"
          />
        </svg>
      </div>
    ),
    size,
  );
}
