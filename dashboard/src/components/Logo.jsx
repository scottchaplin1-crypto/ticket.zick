import { useId, useState } from "react";

// Uses /logo.png if you've dropped one in dashboard/public (see the README there).
// Falls back automatically to the built-in ticket-stub mark if no custom logo
// exists yet — so this never breaks, it just upgrades once you add your own.
export default function Logo({ size = 36, showWordmark = true, className = "" }) {
  const [customLogoFailed, setCustomLogoFailed] = useState(false);

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {!customLogoFailed ? (
        <img
          src="/logo.png"
          alt="Ticket Zick"
          style={{ width: size, height: size }}
          className="object-contain rounded-md"
          onError={() => setCustomLogoFailed(true)}
        />
      ) : (
        <TicketMark size={size} />
      )}
      {showWordmark && (
        <span className="font-bold tracking-tight text-white leading-none" style={{ fontSize: size * 0.42 }}>
          Ticket<span className="text-blurple">Zick</span>
        </span>
      )}
    </div>
  );
}

// The built-in fallback mark — an actual ticket-stub shape (rounded body, punched
// notches on each edge, a dashed tear line, a "hole"), used only when no custom
// logo.png has been uploaded.
function TicketMark({ size }) {
  const maskId = useId();
  const height = Math.round(size * 0.68);

  return (
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
  );
}
