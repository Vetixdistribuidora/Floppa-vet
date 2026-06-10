// Logo de Floppa — cubo oliva relleno sobre tile arena.
// SVG puro (sirve en server y client components). Escalable por `size`.
export default function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" fill="none"
      className={className} role="img" aria-label="Floppa"
    >
      <rect x="3" y="3" width="58" height="58" rx="17" fill="#ddcca8" />
      <path d="M32 14 47 22 32 30 17 22Z" fill="#9aa86a" />
      <path d="M17 22 32 30 32 48 17 40Z" fill="#6f7d49" />
      <path d="M47 22 32 30 32 48 47 40Z" fill="#506037" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.9">
        <path d="M32 14 47 22 47 40 32 48 17 40 17 22Z" />
        <path d="M17 22 32 30 47 22" />
        <path d="M32 30V48" />
      </g>
    </svg>
  )
}
