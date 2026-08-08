import { useEffect, useMemo, useRef, useState } from "react";
import { Smile, Search } from "lucide-react";
import unicodeEmojiData from "unicode-emoji-json";
import { api } from "../api/client.js";

const GROUP_LABELS = {
  "smileys-emotion": "Smileys & Emotion",
  "people-body": "People & Body",
  "animals-nature": "Animals & Nature",
  "food-drink": "Food & Drink",
  "travel-places": "Travel & Places",
  activities: "Activities",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
};

// Built once, shared by every instance of the picker — grouping the full standard
// emoji set is a bit of work and never changes at runtime.
const STANDARD_GROUPS = (() => {
  const groups = {};
  for (const [char, info] of Object.entries(unicodeEmojiData)) {
    const groupKey = info.group || "objects";
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push({ char, name: info.name });
  }
  return Object.entries(groups).map(([key, emojis]) => ({
    label: GROUP_LABELS[key] || key,
    emojis,
  }));
})();

function isCustomRef(value) {
  return /^[\w~]+:\d{15,21}$/.test(value || "");
}

function customEmojiImgUrl(value) {
  const [, id] = value.split(":");
  return `https://cdn.discordapp.com/emojis/${id}.png?size=32`;
}

// One picker used everywhere an emoji can be chosen — shows this server's own
// custom emojis first, then the complete standard Discord emoji set, all
// searchable by name. Two modes:
//   - "select" (default): value + onChange(newValue) — sets a single field
//   - "insert": onInsert(textToAppend) — appends into a text field instead
export default function EmojiPicker({ guildId, value, onChange, mode = "select", onInsert }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customEmojis, setCustomEmojis] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    setOpen((o) => !o);
    if (!customEmojis && guildId) {
      api.get(`/api/guilds/${guildId}/custom-emojis`).then((res) => setCustomEmojis(res.data)).catch(() => setCustomEmojis([]));
    }
  }

  const filteredCustom = useMemo(() => {
    if (!customEmojis) return [];
    const q = query.trim().toLowerCase();
    return q ? customEmojis.filter((e) => e.name.toLowerCase().includes(q)) : customEmojis;
  }, [customEmojis, query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STANDARD_GROUPS;
    return STANDARD_GROUPS.map((g) => ({ ...g, emojis: g.emojis.filter((e) => e.name.includes(q)) })).filter(
      (g) => g.emojis.length > 0
    );
  }, [query]);

  function pick(rawValue) {
    if (mode === "insert") {
      const isCustom = typeof rawValue === "object";
      const text = isCustom ? `<${rawValue.animated ? "a" : ""}:${rawValue.name}:${rawValue.id}>` : rawValue;
      onInsert(text);
    } else {
      const value = typeof rawValue === "object" ? `${rawValue.name}:${rawValue.id}` : rawValue;
      onChange(value);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      {mode === "insert" ? (
        <button type="button" onClick={toggle} title="Insert an emoji" className="text-gray-500 hover:text-cyan-400 transition">
          <Smile size={13} />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          title="Choose an emoji"
          className="input h-10 w-10 flex items-center justify-center text-lg leading-none px-0 overflow-hidden"
        >
          {isCustomRef(value) ? <img src={customEmojiImgUrl(value)} className="w-5 h-5" alt="" /> : value || "—"}
        </button>
      )}

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 max-h-80 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-2">
          <div className="relative mb-2 sticky top-0 bg-[#1a1b1e] pb-1">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              className="input h-8 text-sm pl-7"
              placeholder="Search emoji…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filteredCustom.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">This server</p>
              <div className="grid grid-cols-7 gap-1">
                {filteredCustom.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    title={`:${e.name}:`}
                    onClick={() => pick(e)}
                    className="w-8 h-8 flex items-center justify-center rounded-md transition hover:bg-surface3"
                  >
                    <img src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}?size=32`} className="w-5 h-5" alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">{group.label}</p>
              <div className="grid grid-cols-7 gap-1">
                {group.emojis.map((e) => (
                  <button
                    key={e.char}
                    type="button"
                    title={e.name}
                    onClick={() => pick(e.char)}
                    className={`text-lg leading-none w-8 h-8 flex items-center justify-center rounded-md transition hover:bg-surface3 ${
                      value === e.char ? "bg-cyan-400/20 ring-1 ring-cyan-400" : ""
                    }`}
                  >
                    {e.char}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredCustom.length === 0 && filteredGroups.length === 0 && (
            <p className="text-xs text-gray-500 p-2 text-center">No emoji found.</p>
          )}

          {mode === "select" && (
            <div className="border-t border-white/5 pt-2 mt-1">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 px-0.5">Custom code</p>
              <input
                className="input h-8 text-sm"
                placeholder="Or paste any emoji/code directly"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
