import { useId } from "react";

// The signature visual for Ticket Zick — an actual ticket-stub shape (rounded body,
// punched notches on each edge, a dashed tear line, and a "hole"), rather than a
// generic icon. Uses an SVG mask so the notches are true cutouts, independent of
// whatever background it's placed on.
export default function Logo({ size = 36, showWordmark = true, className = "" }) {
  const maskId = useId();
  const height = Math.round(size * 0.68);

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={height} viewBox="0 0 40 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <mask id={maskId}>
          <rect x="0" y="0" width="40" height="27" rx="6" fill="white" />
          <circle cx="0" cy="13.5" r="5" fill="black" />
          <circle cx="40" cy="13.5" r="5" fill="black" />
        </mask>
        <rect x="0" y="0" width="40" height="27" rx="6" fill="#5865F2" mask={`url(#${maskId})`} />
        <line x1="27" y1="4" x2="27" y2="23" stroke="#161719" strokeWidth="2" strokeDasharray="2.5 3" mask={`url(#${maskId})`} />
        <circle cx="27" cy="13.5" r="2" fill="#FEE75C" mask={`url(#${maskId})`} />
      </svg>
      {showWordmark && (
        <span className="font-bold tracking-tight text-white leading-none" style={{ fontSize: size * 0.42 }}>
          Ticket<span className="text-blurple">Zick</span>
        </span>
      )}
    </div>
  );
}
