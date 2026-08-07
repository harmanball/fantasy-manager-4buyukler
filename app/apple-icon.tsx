import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#0F3D2E" />
        <circle cx="16" cy="16" r="12" fill="#F5F1E8" stroke="#111111" strokeWidth="1.3" />
        <polygon points="16,10.5 19.4,13 18.2,17 13.8,17 12.6,13" fill="#111111" />
        <line x1="16" y1="10.5" x2="16" y2="6.5" stroke="#111111" strokeWidth="1.1" />
        <line x1="19.4" y1="13" x2="23.6" y2="11.6" stroke="#111111" strokeWidth="1.1" />
        <line x1="18.2" y1="17" x2="20.8" y2="21.2" stroke="#111111" strokeWidth="1.1" />
        <line x1="13.8" y1="17" x2="11.2" y2="21.2" stroke="#111111" strokeWidth="1.1" />
        <line x1="12.6" y1="13" x2="8.4" y2="11.6" stroke="#111111" strokeWidth="1.1" />
      </svg>
    ),
    { ...size }
  );
}
