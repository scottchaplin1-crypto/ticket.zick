import { Bold, Italic, Link2 } from "lucide-react";

// A tiny formatting toolbar for fields that support Discord's embed markdown
// (bold, italic, links) — writing that syntax by hand is exactly where things
// go wrong, e.g. mixing up [text](url) as (text)[url]. This inserts it
// correctly every time instead. Needs a ref to the actual underlying <input>/
// <textarea> DOM node, since selection-aware insertion isn't possible through
// React's value/onChange alone.
export default function MarkdownToolbar({ fieldRef, value, onChange }) {
  function wrapSelection(marker) {
    const el = fieldRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || "text";
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  }

  function insertLink() {
    const el = fieldRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const linkText = value.slice(start, end) || "link text";
    const next = value.slice(0, start) + `[${linkText}](https://)` + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      // Selects the "https://" placeholder so they can immediately type the real URL over it.
      const urlStart = start + linkText.length + 3;
      el.setSelectionRange(urlStart, urlStart + 8);
    });
  }

  const btnClass = "p-1 rounded text-gray-500 hover:text-cyan-400 hover:bg-white/5 transition";

  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => wrapSelection("**")} className={btnClass} title="Bold">
        <Bold size={12} />
      </button>
      <button type="button" onClick={() => wrapSelection("*")} className={btnClass} title="Italic">
        <Italic size={12} />
      </button>
      <button type="button" onClick={insertLink} className={btnClass} title="Insert link">
        <Link2 size={12} />
      </button>
    </div>
  );
}
