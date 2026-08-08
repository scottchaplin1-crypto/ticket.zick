import { useEffect, useRef, useState } from "react";

function roleColor(role) {
  return role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99AAB5";
}

// Lets a panel ping any combination of roles when a ticket opens — not just "staff",
// since some servers want event-specific roles (event staff, a particular member
// running their own event) pulled in rather than the whole support team.
export default function RoleMultiSelect({ roles, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const selectedRoles = roles.filter((r) => selected.includes(r.id));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input min-h-[42px] h-auto flex items-center flex-wrap gap-1.5 py-1.5"
      >
        {selectedRoles.length === 0 && <span className="text-gray-500 text-sm">No roles selected</span>}
        {selectedRoles.map((r) => (
          <span key={r.id} className="text-xs bg-surface3 pl-1.5 pr-2 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: roleColor(r) }} />
            {r.name}
          </span>
        ))}
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-56 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-1.5">
          {roles.length === 0 && <p className="text-xs text-gray-500 p-2">No roles found — make sure the bot is still in this server.</p>}
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface3 cursor-pointer text-sm text-gray-200">
              <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} className="accent-cyan-400" />
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: roleColor(r) }} />
              {r.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
