import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke="#0F5D4C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
