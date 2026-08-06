import { useEffect, useRef, useState } from "react";

// A curated set rather than a full emoji keyboard, but broad enough to cover most
// use cases — grouped so browsing feels intentional rather than overwhelming.
const GROUPS = [
  {
    label: "Support & Status",
    emojis: [
      ["🎫", "ticket"], ["🎟️", "admission tickets"], ["🛠️", "tools"], ["🔧", "wrench"],
      ["💬", "speech balloon"], ["❓", "question mark"], ["❗", "exclamation mark"], ["📩", "envelope with arrow"],
      ["📝", "memo"], ["🔔", "bell"], ["🙋", "raising hand"], ["📌", "pushpin"],
      ["✅", "check mark"], ["❌", "cross mark"], ["⚠️", "warning"], ["🔒", "locked"],
      ["🔓", "unlocked"], ["⏳", "hourglass"], ["🚨", "alert"], ["✨", "sparkles"],
    ],
  },
  {
    label: "Smileys",
    emojis: [
      ["😀", "grinning"], ["😄", "big smile"], ["😁", "beaming"], ["😂", "tears of joy"],
      ["🙂", "slight smile"], ["😉", "wink"], ["😍", "heart eyes"], ["🥳", "party"],
      ["😎", "sunglasses"], ["🤔", "thinking"], ["😴", "sleeping"], ["🤯", "mind blown"],
      ["😭", "crying"], ["😡", "angry"], ["🥶", "cold"], ["🤗", "hug"],
    ],
  },
  {
    label: "Gestures & People",
    emojis: [
      ["👍", "thumbs up"], ["👎", "thumbs down"], ["👏", "clap"], ["🙌", "raised hands"],
      ["🤝", "handshake"], ["💪", "flexed bicep"], ["🫡", "salute"], ["🤞", "crossed fingers"],
      ["👑", "crown"], ["🧑‍💻", "coder"], ["🕵️", "detective"], ["🥷", "ninja"],
    ],
  },
  {
    label: "Animals & Nature",
    emojis: [
      ["🐶", "dog"], ["🐱", "cat"], ["🦊", "fox"], ["🐻", "bear"],
      ["🐼", "panda"], ["🦁", "lion"], ["🐸", "frog"], ["🐧", "penguin"],
      ["🦉", "owl"], ["🐉", "dragon"], ["🌿", "herb"], ["🌸", "blossom"],
      ["🌙", "moon"], ["⭐", "star"], ["🔥", "fire"], ["🌈", "rainbow"],
    ],
  },
  {
    label: "Food & Drink",
    emojis: [
      ["🍕", "pizza"], ["🍔", "burger"], ["🍟", "fries"], ["🌮", "taco"],
      ["🍩", "donut"], ["🍰", "cake"], ["☕", "coffee"], ["🍺", "beer"],
      ["🍷", "wine"], ["🍿", "popcorn"], ["🍫", "chocolate"], ["🍎", "apple"],
    ],
  },
  {
    label: "Activities & Games",
    emojis: [
      ["🎮", "controller"], ["🎲", "dice"], ["🎯", "dart"], ["🏆", "trophy"],
      ["⚔️", "crossed swords"], ["🛡️", "shield"], ["🎵", "music note"], ["🎨", "art"],
      ["⚽", "soccer"], ["🏀", "basketball"], ["🎳", "bowling"], ["🧩", "puzzle"],
    ],
  },
  {
    label: "Objects & Symbols",
    emojis: [
      ["🚀", "rocket"], ["💡", "idea"], ["📦", "package"], ["🎧", "headset"],
      ["📣", "megaphone"], ["🗓️", "calendar"], ["💰", "money bag"], ["🎁", "gift"],
      ["💎", "gem"], ["🧭", "compass"], ["📚", "books"], ["🔑", "key"],
      ["♥️", "red heart"], ["💙", "blue heart"], ["💚", "green heart"], ["💜", "purple heart"],
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
        title="Choose an emoji"
        className="input h-10 w-10 flex items-center justify-center text-lg leading-none px-0"
      >
        {value || "—"}
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 max-h-80 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-3">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">{group.label}</p>
              <div className="grid grid-cols-7 gap-1">
                {group.emojis.map(([emoji, name]) => (
                  <button
                    key={emoji}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(emoji);
                      setOpen(false);
                    }}
                    className={`text-lg leading-none w-8 h-8 flex items-center justify-center rounded-md transition hover:bg-surface3 ${
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
