import { AlertTriangle } from "lucide-react";

export default function ConfirmDiscardModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface2 border border-white/10 rounded-xl shadow-2xl max-w-sm w-full p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <h3 className="font-semibold text-gray-100">Unsaved changes</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          You have changes that haven't been saved yet. Leaving now will discard them.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-surface3 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/90 hover:bg-red-500 text-white transition">
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
