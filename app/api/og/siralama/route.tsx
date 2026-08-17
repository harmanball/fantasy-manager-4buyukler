import { ImageResponse } from "next/og";

export const runtime = "edge";

// Not: Renkler tailwind.config'teki pitch/gold/ivory/charcoal tokenlarının
// yaklaşık karşılığı — gerçek hex değerlerini paylaşırsan birebir eşitlerim.
const PITCH = "#0B3D2E";
const GOLD = "#D4AF37";
const IVORY = "#F5F1E8";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rank = searchParams.get("rank") ?? "-";
  const points = searchParams.get("points") ?? "0";
  const name = searchParams.get("name") ?? "";
  const scope = searchParams.get("scope") ?? "Genel Toplam";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PITCH,
          color: IVORY,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.75, letterSpacing: 2 }}>
          FANTASY MANAGER: 4 BÜYÜKLER
        </div>
        <div style={{ fontSize: 26, opacity: 0.55, marginTop: 8 }}>{scope}</div>
        <div style={{ fontSize: 140, fontWeight: 700, color: GOLD, marginTop: 24 }}>
          #{rank}
        </div>
        {name && (
          <div style={{ fontSize: 42, fontWeight: 600, marginTop: 8 }}>{name}</div>
        )}
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 12 }}>{points} puan</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
