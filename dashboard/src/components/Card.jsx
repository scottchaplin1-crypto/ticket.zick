export default function Card({ title, children, actions }) {
  return (
    <div className="bg-surface2/90 border border-white/5 rounded-xl p-5 shadow-lg shadow-black/10">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-gray-200">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
