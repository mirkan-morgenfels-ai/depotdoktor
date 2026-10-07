import { ImageResponse } from "next/og";

export const alt = "DepotDoktor – Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#111111",
          color: "#fbfaf6",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#b8912f" }}>Portfolio-Projekt</div>
        <div style={{ fontSize: 112, marginTop: 24, lineHeight: 1 }}>DepotDoktor</div>
        <div style={{ width: 240, height: 6, marginTop: 40, background: "#b8912f" }} />
        <div style={{ fontSize: 40, marginTop: 40, lineHeight: 1.3, maxWidth: 960 }}>
          Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte. Die Auswertung läuft vollständig im Browser.
        </div>
      </div>
    ),
    size,
  );
}
