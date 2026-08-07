// A pill-style on/off switch, used anywhere a plain checkbox was doing the job of
// "this feature is on or off" — reads more clearly at a glance than a checkbox does.
export default function Toggle({ checked, onChange, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-cyan-500" : "bg-surface3 border border-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
      {label && (
        <button type="button" onClick={() => onChange(!checked)} className="text-sm text-gray-300 text-left">
          {label}
        </button>
      )}
    </div>
  );
}
