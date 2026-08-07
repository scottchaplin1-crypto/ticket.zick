import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

// A styled dropdown to replace native <select> elements, which can't be restyled
// consistently across browsers (that's the "basic looking" native picker). Options:
// [{ value, label, color? (hex dot), icon? (image URL, e.g. a custom emoji), accent?
// (true = highlighted/cyan text, for actions like "create new") }]
export default function Select({ value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input h-10 flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
          {selected?.icon && <img src={selected.icon} className="w-4 h-4 rounded-sm shrink-0" alt="" />}
          <span className={selected ? "text-gray-100" : "text-gray-500"}>{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown size={14} className={`text-gray-500 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-1.5">
          {options.length === 0 && <p className="text-xs text-gray-500 p-2">No options.</p>}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface3 transition text-left text-sm ${
                o.accent ? "text-cyan-400" : "text-gray-200"
              }`}
            >
              {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
              {o.icon && <img src={o.icon} className="w-4 h-4 rounded-sm shrink-0" alt="" />}
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check size={13} className="text-cyan-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
