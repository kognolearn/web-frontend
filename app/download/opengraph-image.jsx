import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Download Kogno - AI-Powered Learning App";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Decorative gradient orb */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: -100,
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Download Icon */}
        <div
          style={{
            width: 100,
            height: 100,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            background: "linear-gradient(90deg, #ffffff 0%, #e0e7ff 100%)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 16,
          }}
        >
          Download Kogno
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#a5b4fc",
            fontWeight: 500,
            marginBottom: 32,
          }}
        >
          AI-Powered Learning for Desktop
        </div>

        {/* Platform badges */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 8,
          }}
        >
          {["Windows", "macOS", "Linux"].map((platform) => (
            <div
              key={platform}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                background: "rgba(99, 102, 241, 0.2)",
                borderRadius: 12,
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              <span style={{ fontSize: 22, color: "#e0e7ff" }}>{platform}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
