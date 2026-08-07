import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { api } from "../api/client.js";

// Inserts a real server emoji code (e.g. <:onyx:1411143...>) without needing to
// know or type it — click one and it's appended to the field for you.
export default function CustomEmojiPicker({ guildId, onInsert }) {
  const [open, setOpen] = useState(false);
  const [emojis, setEmojis] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
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
    if (!emojis) {
      api
        .get(`/api/guilds/${guildId}/custom-emojis`)
        .then((res) => setEmojis(res.data))
        .catch(() => {
          setEmojis([]);
          setLoadFailed(true);
        });
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={toggle} title="Insert a custom server emoji" className="text-gray-500 hover:text-cyan-400 transition">
        <Smile size={13} />
      </button>
      {open && (
        <div className="absolute z-30 right-0 mt-1 w-56 max-h-52 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-2">
          {emojis === null && <p className="text-xs text-gray-500 p-1">Loading…</p>}
          {emojis?.length === 0 && loadFailed && (
            <p className="text-xs text-red-400 p-1">
              Couldn't load emojis — check the server's logs for the real error (likely a permissions issue).
            </p>
          )}
          {emojis?.length === 0 && !loadFailed && <p className="text-xs text-gray-500 p-1">No custom emojis found in this server.</p>}
          <div className="grid grid-cols-6 gap-1">
            {emojis?.map((e) => (
              <button
                key={e.id}
                type="button"
                title={`:${e.name}:`}
                onClick={() => {
                  onInsert(`<${e.animated ? "a" : ""}:${e.name}:${e.id}>`);
                  setOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface3 transition"
              >
                <img src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}?size=32`} className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
