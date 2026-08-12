import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="92" height="92" rx="10" fill="#0F3D2E" />
        <rect x="12" y="12" width="76" height="76" fill="none" stroke="#F5F1E8" strokeWidth="3" />
        <line x1="12" y1="50" x2="88" y2="50" stroke="#F5F1E8" strokeWidth="3" />
        <circle cx="50" cy="50" r="14" fill="none" stroke="#F5F1E8" strokeWidth="3" />
        <circle cx="50" cy="50" r="2.5" fill="#F5F1E8" />
        <rect x="30" y="12" width="40" height="14" fill="none" stroke="#F5F1E8" strokeWidth="3" />
        <rect x="30" y="74" width="40" height="14" fill="none" stroke="#F5F1E8" strokeWidth="3" />
      </svg>
    ),
    { width: 512, height: 512 }
  );
}
