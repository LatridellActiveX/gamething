// Tiny pixel-art flask used for Research Points (inline SVG, no extra assets).
export function RpIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="rp-icon" width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="0" width="2" height="1" fill="#cbd5e1" />
      <rect x="3" y="1" width="2" height="2" fill="#e2e8f0" />
      <rect x="2" y="3" width="4" height="1" fill="#e2e8f0" />
      <rect x="1" y="4" width="6" height="3" fill="#a78bfa" />
      <rect x="2" y="4" width="1" height="1" fill="#ddd6fe" />
      <rect x="1" y="7" width="6" height="1" fill="#6d28d9" />
    </svg>
  );
}
