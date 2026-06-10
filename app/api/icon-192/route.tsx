import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#ddcca8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="138" height="138" viewBox="0 0 64 64" style={{ display: "flex" }}>
          <path d="M32 14 47 22 32 30 17 22Z" fill="#9aa86a" />
          <path d="M17 22 32 30 32 48 17 40Z" fill="#6f7d49" />
          <path d="M47 22 32 30 32 48 47 40Z" fill="#506037" />
          <path d="M32 14 47 22 47 40 32 48 17 40 17 22Z" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M17 22 32 30 47 22" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 30 32 48" fill="none" stroke="#ffffff" strokeWidth="1.6" />
        </svg>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
