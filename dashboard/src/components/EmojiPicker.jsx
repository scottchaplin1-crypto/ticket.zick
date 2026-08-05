import { useEffect, useRef, useState } from "react";

// A curated set rather than a full emoji keyboard — these are the ones that actually
// make sense on a "open a ticket" button, grouped so browsing feels intentional
// rather than like scrolling an entire unicode table.
const GROUPS = [
  {
    label: "Support",
    emojis: [
      ["🎫", "ticket"], ["🎟️", "admission tickets"], ["🛠️", "tools"], ["🔧", "wrench"],
      ["💬", "speech balloon"], ["❓", "question mark"], ["❗", "exclamation mark"], ["📩", "envelope with arrow"],
      ["📝", "memo"], ["🔔", "bell"], ["🙋", "raising hand"], ["📌", "pushpin"],
    ],
  },
  {
    label: "Status",
    emojis: [
      ["✅", "check mark"], ["❌", "cross mark"], ["⚠️", "warning"], ["🔒", "locked"],
      ["🔓", "unlocked"], ["⏳", "hourglass"], ["🚨", "alert"], ["✨", "sparkles"],
    ],
  },
  {
    label: "General",
    emojis: [
      ["🚀", "rocket"], ["💡", "idea"], ["📦", "package"], ["🎧", "support headset"],
      ["👋", "wave"], ["⭐", "star"], ["🔥", "fire"], ["📣", "megaphone"],
    ],
  },
];

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between h-10"
      >
        <span className="text-lg leading-none">{value || "—"}</span>
        <span className="text-xs text-gray-500">Choose…</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-64 max-h-72 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-3">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">{group.label}</p>
              <div className="grid grid-cols-6 gap-1">
                {group.emojis.map(([emoji, name]) => (
                  <button
                    key={emoji}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(emoji);
                      setOpen(false);
                    }}
                    className={`text-lg leading-none w-9 h-9 flex items-center justify-center rounded-md transition hover:bg-surface3 ${
                      value === emoji ? "bg-cyan-400/20 ring-1 ring-cyan-400" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-white/5 pt-2 mt-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 px-0.5">Custom</p>
            <input
              className="input h-8 text-sm"
              placeholder="Paste any emoji, e.g. 🧵"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
