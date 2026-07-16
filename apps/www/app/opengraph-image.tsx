import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Weave - Financial Connectivity, Seamlessly Interwoven";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F4EF",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -100,
            top: 140,
            width: 1400,
            height: 120,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(232,168,140,0.55) 20%, rgba(232,168,140,0.55) 80%, transparent 100%)",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -80,
            top: 380,
            width: 1400,
            height: 140,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(15,93,76,0.18) 20%, rgba(15,93,76,0.18) 80%, transparent 100%)",
            filter: "blur(10px)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width={72} height={72} viewBox="0 0 24 24" fill="none">
            <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke="#0F5D4C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 9 L12 19 L19 9" stroke="#0B0F0E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </svg>
          <span style={{ fontSize: 76, fontWeight: 600, letterSpacing: -1, color: "#0B0F0E" }}>
            Weave
          </span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            color: "#3A4240",
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          One checkout that weaves fiat and crypto into a single thread.
        </div>
      </div>
    ),
    { ...size }
  );
}
