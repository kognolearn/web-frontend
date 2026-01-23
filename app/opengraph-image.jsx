import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Kogno - Learn Smarter, Not Harder";
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

        {/* Logo/Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 24,
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 700 }}>K</span>
          </div>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              background: "linear-gradient(90deg, #ffffff 0%, #e0e7ff 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Kogno
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: "#a5b4fc",
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          Learn Smarter, Not Harder
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 20,
          }}
        >
          {["AI Courses", "Practice Exams", "Study Materials"].map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 24,
                color: "#94a3b8",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6366f1",
                }}
              />
              {feature}
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
