import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#F5F1E8" stroke="#111111" strokeWidth="1.6" />
        <polygon points="16,9 20.3,12.1 18.7,17.1 13.3,17.1 11.7,12.1" fill="#111111" />
        <line x1="16" y1="9" x2="16" y2="3" stroke="#111111" strokeWidth="1.3" />
        <line x1="20.3" y1="12.1" x2="26.2" y2="10.2" stroke="#111111" strokeWidth="1.3" />
        <line x1="18.7" y1="17.1" x2="22.2" y2="22.7" stroke="#111111" strokeWidth="1.3" />
        <line x1="13.3" y1="17.1" x2="9.8" y2="22.7" stroke="#111111" strokeWidth="1.3" />
        <line x1="11.7" y1="12.1" x2="5.8" y2="10.2" stroke="#111111" strokeWidth="1.3" />
      </svg>
    ),
    { ...size }
  );
}
