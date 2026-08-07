import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Toggle from "../components/Toggle.jsx";
import SaveStatus from "../components/SaveStatus.jsx";
import ImageUrlField from "../components/ImageUrlField.jsx";
import { useAutoSave } from "../hooks/useAutoSave.js";

export default function Branding({ guildId }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    api.get(`/api/customization/guild/${guildId}`).then((res) => setForm(res.data));
  }, [guildId]);

  const status = useAutoSave(form, () => api.put(`/api/customization/guild/${guildId}`, form), {
    enabled: !!form,
    resetKey: guildId,
  });

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Branding</h1>
        <SaveStatus status={status} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card title="Customise your Ticket Zick setup">
          <div className="space-y-3">
            <Field label="Brand name"><input className="input" value={form.brandName} onChange={set("brandName")} /></Field>
            <ImageUrlField label="Logo URL" value={form.logoUrl} onChange={(v) => setForm({ ...form, logoUrl: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary color"><input type="color" className="input h-10" value={form.primaryColor} onChange={set("primaryColor")} /></Field>
              <Field label="Accent color"><input type="color" className="input h-10" value={form.accentColor} onChange={set("accentColor")} /></Field>
            </div>
            <Field label="Welcome message (shown when a ticket opens)">
              <textarea className="input" rows={3} value={form.welcomeMessage} onChange={set("welcomeMessage")} />
            </Field>
            <Field label="Footer text"><input className="input" value={form.footerText} onChange={set("footerText")} /></Field>
            <Toggle checked={form.darkMode} onChange={(v) => setForm({ ...form, darkMode: v })} label="Dark mode dashboard theme" />
          </div>
        </Card>

        <Card title="Preview">
          <div className="bg-[#313338] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              {form.logoUrl ? (
                <img src={form.logoUrl} className="w-8 h-8 rounded" />
              ) : (
                <div className="w-8 h-8 rounded" style={{ background: form.primaryColor }} />
              )}
              <span className="font-bold text-white">{form.brandName}</span>
            </div>
            <div className="rounded p-3 border-l-4 bg-black/20" style={{ borderColor: form.primaryColor }}>
              <p className="text-white font-semibold text-sm">Ticket #0001</p>
              <p className="text-gray-300 text-sm mt-1">{form.welcomeMessage}</p>
              <p className="text-gray-500 text-xs mt-2">{form.footerText}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
