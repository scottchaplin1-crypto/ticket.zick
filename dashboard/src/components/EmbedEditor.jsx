import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Copy, Plus, X } from "lucide-react";
import ImageUrlField from "./ImageUrlField.jsx";
import CustomEmojiPicker from "./CustomEmojiPicker.jsx";

const DEFAULT_EMBED = () => ({
  id: `e_${Math.random().toString(36).slice(2, 9)}`,
  title: "",
  description: "",
  color: "#5865F2",
  url: "",
  authorName: "",
  authorIconUrl: "",
  footerText: "",
  footerIconUrl: "",
  imageUrl: "",
  thumbnailUrl: "",
  fields: [],
});

export { DEFAULT_EMBED };

export default function EmbedEditor({ embed, index, guildId, onChange, onRemove, onDuplicate }) {
  const [open, setOpen] = useState(true);
  const set = (key) => (e) => onChange({ ...embed, [key]: e.target.value });

  function addField() {
    onChange({ ...embed, fields: [...(embed.fields || []), { name: "", value: "", inline: false }] });
  }
  function updateField(i, key, value) {
    const fields = [...embed.fields];
    fields[i] = { ...fields[i], [key]: value };
    onChange({ ...embed, fields });
  }
  function removeField(i) {
    onChange({ ...embed, fields: embed.fields.filter((_, idx) => idx !== i) });
  }

  const previewText = embed.title || embed.description || "Empty embed";

  return (
    <div className="rounded-lg border-l-4 bg-surface3 overflow-hidden" style={{ borderColor: embed.color || "#5865F2" }}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
          <span className="text-sm font-medium text-gray-200 truncate">
            Embed {index + 1} — {previewText}
          </span>
        </button>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button onClick={onDuplicate} title="Duplicate" className="text-gray-500 hover:text-cyan-400 transition">
            <Copy size={14} />
          </button>
          <button onClick={onRemove} title="Remove" className="text-gray-500 hover:text-red-400 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Title</span>
              <input className="input h-9 text-sm" value={embed.title} onChange={set("title")} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Color</span>
              <input type="color" className="input h-9 w-12 px-1" value={embed.color} onChange={set("color")} />
            </label>
          </div>

          <label className="block">
            <span className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Description</span>
              <CustomEmojiPicker guildId={guildId} onInsert={(code) => onChange({ ...embed, description: embed.description + code })} />
            </span>
            <textarea className="input text-sm" rows={3} value={embed.description} onChange={set("description")} />
          </label>

          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Title link URL (optional)</span>
            <input className="input h-9 text-sm" value={embed.url} onChange={set("url")} placeholder="https://…" />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Author name</span>
              <input className="input h-9 text-sm" value={embed.authorName} onChange={set("authorName")} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Author icon URL</span>
              <input className="input h-9 text-sm" value={embed.authorIconUrl} onChange={set("authorIconUrl")} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Footer text</span>
              <input className="input h-9 text-sm" value={embed.footerText} onChange={set("footerText")} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Footer icon URL</span>
              <input className="input h-9 text-sm" value={embed.footerIconUrl} onChange={set("footerIconUrl")} />
            </label>
          </div>

          <ImageUrlField label="Image" value={embed.imageUrl} onChange={(v) => onChange({ ...embed, imageUrl: v })} />
          <ImageUrlField label="Thumbnail" value={embed.thumbnailUrl} onChange={(v) => onChange({ ...embed, thumbnailUrl: v })} />

          <div>
            <span className="block text-xs text-gray-400 mb-1.5">Fields</span>
            <div className="space-y-1.5">
              {(embed.fields || []).map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 bg-surface2 rounded-lg p-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      className="input h-8 text-sm"
                      placeholder="Field name"
                      value={f.name}
                      onChange={(e) => updateField(i, "name", e.target.value)}
                    />
                    <textarea
                      className="input text-sm"
                      rows={2}
                      placeholder="Field value"
                      value={f.value}
                      onChange={(e) => updateField(i, "value", e.target.value)}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-gray-400">
                      <input type="checkbox" checked={!!f.inline} onChange={(e) => updateField(i, "inline", e.target.checked)} />
                      Inline
                    </label>
                  </div>
                  <button onClick={() => removeField(i)} className="text-gray-500 hover:text-red-400 transition shrink-0 mt-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addField}
                className="w-full py-1.5 border border-dashed border-white/15 hover:border-cyan-400 hover:text-cyan-400 transition rounded-lg text-xs text-gray-400 flex items-center justify-center gap-1"
              >
                <Plus size={12} /> Add field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
