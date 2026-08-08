const CONFIG = {
  saving: { text: "Saving…", cls: "text-gray-400" },
  saved: { text: "All changes saved", cls: "text-green-400" },
  error: { text: "Couldn't save — check your connection", cls: "text-red-400" },
};

export default function SaveStatus({ status }) {
  const s = CONFIG[status];
  if (!s) return <div className="h-4" />; // reserves space so layout doesn't jump around
  return (
    <p className={`text-xs ${s.cls} flex items-center gap-1.5 h-4`}>
      {status === "saving" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {s.text}
    </p>
  );
}
