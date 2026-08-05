// A small floating tooltip, used for hover-help on form fields. Deliberately not the
// browser's native title tooltip — this one matches the dashboard's own look (dark
// bubble, small arrow, quick fade) instead of the OS default styling.
export default function Tooltip({ text, children }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block whitespace-normal w-max max-w-[220px] rounded-md bg-[#111214] border border-cyan-400/20 px-2.5 py-1.5 text-xs text-gray-200 shadow-xl z-30 leading-snug">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111214] border-r border-b border-cyan-400/20 rotate-45 -mt-1" />
      </span>
    </span>
  );
}
