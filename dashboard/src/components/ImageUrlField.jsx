import { useState } from "react";
import { Info, ImageOff, ImageIcon } from "lucide-react";
import Tooltip from "./Tooltip.jsx";

const HOW_TO_TEXT =
  "Easiest way: send the image in any Discord channel (even a DM to yourself), then right-click it → Copy Link. Paste that link here. You can also right-click almost any image on a website and choose \"Copy image address.\"";

// A URL field specifically for images — shows a live thumbnail once something's
// pasted (so you instantly know if it worked), and a plain-language tip on how to
// actually get an image link, since that's usually the real sticking point.
export default function ImageUrlField({ label, value, onChange, placeholder = "Paste an image link…" }) {
  const [failed, setFailed] = useState(false);

  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        {label}
        <Tooltip text={HOW_TO_TEXT}>
          <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
        </Tooltip>
      </span>
      <div className="flex items-center gap-2">
        <input
          className="input flex-1"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => {
            setFailed(false);
            onChange(e.target.value);
          }}
        />
        <div className="w-10 h-10 rounded-lg bg-surface3 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          {!value ? (
            <ImageIcon size={16} className="text-gray-600" />
          ) : failed ? (
            <ImageOff size={16} className="text-red-400" />
          ) : (
            <img src={value} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
          )}
        </div>
      </div>
      {failed && <p className="text-xs text-red-400 mt-1">Couldn't load an image from that link — double check it's correct.</p>}
    </label>
  );
}
