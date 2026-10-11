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
          background: "#F5F4EF",
        }}
      >
        <svg width={120} height={120} viewBox="0 0 24 24" fill="none">
          <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke="#0F5D4C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9 L12 19 L19 9" stroke="#0B0F0E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
