import { useEffect, useRef, useState } from "react";
import { Coins, ShoppingBag, Trophy, ScrollText, Plus, Trash2, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import Toggle from "../components/Toggle.jsx";
import Tooltip from "../components/Tooltip.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

const BLANK_ITEM = { name: "New Item", description: "", emoji: "🎁", price: 100, limited: false, roleId: "", enabled: true };

function isCustomEmoji(value) {
  return /^[\w~]+:\d{15,21}$/.test(value || "");
}

// A plain-text dropdown can't render a custom server emoji as an actual image, so
// this falls back to just the currency name for those — but shows the real emoji
// character directly when it's a standard unicode one.
function formatPrice(price, config) {
  return isCustomEmoji(config.currencyEmoji) ? `${price} ${config.currencyName}` : `${price} ${config.currencyEmoji} ${config.currencyName}`;
}

export default function Economy({ guildId }) {
  const [config, setConfig] = useState(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const configBaselineRef = useRef(null);

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK_ITEM);
  const [itemSaving, setItemSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [balances, setBalances] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const { isDirty, setDirty, requestNavigation } = useUnsavedChanges();
  const itemBaselineRef = useRef(JSON.stringify(BLANK_ITEM));

  function loadItems() {
    return api.get(`/api/economy/guild/${guildId}/items`).then((res) => {
      setItems(res.data);
      return res.data;
    });
  }

  useEffect(() => {
    api.get(`/api/economy/guild/${guildId}/config`).then((res) => {
      setConfig(res.data);
      configBaselineRef.current = JSON.stringify(res.data);
    });
    loadItems();
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
    api.get(`/api/economy/guild/${guildId}/balances`).then((res) => setBalances(res.data));
    api.get(`/api/economy/guild/${guildId}/purchases`).then((res) => setPurchases(res.data));
  }, [guildId]);

  useEffect(() => {
    setDirty(JSON.stringify(form) !== itemBaselineRef.current);
  }, [form]);

  if (!config) return <p className="text-gray-500">Loading…</p>;

  const textChannels = channels.filter((c) => c.type === 0);

  function updateConfig(patch) {
    setConfig({ ...config, ...patch });
    setConfigSaved(false);
  }

  async function saveConfig() {
    setConfigSaving(true);
    try {
      await api.put(`/api/economy/guild/${guildId}/config`, config);
      configBaselineRef.current = JSON.stringify(config);
      setConfigSaved(true);
    } finally {
      setConfigSaving(false);
    }
  }

  function applySelection(item) {
    setSelected(item?.id ?? null);
    const data = item || BLANK_ITEM;
    setForm(data);
    itemBaselineRef.current = JSON.stringify(data);
  }

  function selectItem(item) {
    requestNavigation(() => applySelection(item));
  }
  function newItem() {
    requestNavigation(() => applySelection(null));
  }

  async function saveItem() {
    setItemSaving(true);
    try {
      if (selected) {
        await api.patch(`/api/economy/items/${selected}`, form);
        await loadItems();
        itemBaselineRef.current = JSON.stringify(form);
        setDirty(false);
      } else {
        const { data } = await api.post(`/api/economy/guild/${guildId}/items`, form);
        await loadItems();
        applySelection(data);
      }
    } finally {
      setItemSaving(false);
    }
  }

  async function removeItem() {
    if (!selected || !confirm("Delete this item? Past purchases stay on record, but it'll disappear from the store.")) return;
    await api.delete(`/api/economy/items/${selected}`);
    await loadItems();
    applySelection(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Economy</h1>

      <div className="grid grid-cols-2 gap-6 items-start mb-6">
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <Coins size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Currency settings</h3>
          </div>
          <div className="space-y-3">
            <Toggle checked={config.enabled} onChange={(v) => updateConfig({ enabled: v })} label="Enabled" />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Currency name</span>
                <input className="input" value={config.currencyName} onChange={(e) => updateConfig({ currencyName: e.target.value })} placeholder="Coins" />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Emoji</span>
                <EmojiPicker guildId={guildId} value={config.currencyEmoji} onChange={(v) => updateConfig({ currencyEmoji: v })} />
              </label>
            </div>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Collection log channel
                <Tooltip text="Every purchase gets announced here — a public 'so-and-so unlocked X' post, like an achievement.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <Select
                value={config.collectionLogChannelId || ""}
                onChange={(v) => updateConfig({ collectionLogChannelId: v })}
                options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
                placeholder="No channel (don't announce)"
              />
            </label>
            {configSaved && <p className="text-xs text-green-400">Saved.</p>}
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="w-full py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50 text-sm"
            >
              {configSaving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <ScrollText size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Commands</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            <p><code className="text-gray-200">/balance</code> — check your currency</p>
            <p><code className="text-gray-200">/store</code> — see what's available</p>
            <p><code className="text-gray-200">/buy item</code> — purchase something</p>
            <p><code className="text-gray-200">/give-currency user amount</code> — staff-only, manually grant or remove currency</p>
            <p className="text-xs text-gray-500 pt-1">
              There's no automatic way to earn currency yet — that's a planned follow-up. For now, grant it manually
              with <code>/give-currency</code>.
            </p>
          </div>
        </Card>
      </div>

      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-2">Store items</h2>
        <Select
          value={selected || ""}
          onChange={(id) => selectItem(items.find((i) => i.id === id))}
          options={items.map((i) => ({ value: i.id, label: `${i.emoji} ${i.name} — ${formatPrice(i.price, config)}` }))}
          placeholder={items.length ? "Select an item…" : "No items yet — create one below"}
        />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={newItem} className="flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium">
          <Plus size={16} /> New Item
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <ShoppingBag size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">{selected ? "Edit item" : "New item"}</h3>
          </div>
          <div className="space-y-3">
            {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
            <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Emoji</span>
                <EmojiPicker guildId={guildId} value={form.emoji} onChange={(v) => setForm({ ...form, emoji: v })} />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Name</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Description</span>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Price (in {config.currencyName})</span>
              <input type="number" min={0} className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Role reward (optional)
                <Tooltip text="Granted automatically the moment someone buys this item.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <Select
                value={form.roleId || ""}
                onChange={(v) => setForm({ ...form, roleId: v })}
                options={roles.map((r) => ({
                  value: r.id,
                  label: r.name,
                  color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#99AAB5",
                }))}
                placeholder="No role"
              />
            </label>
            <Toggle
              checked={form.limited}
              onChange={(v) => setForm({ ...form, limited: v })}
              label="Limited — one per person"
            />
            <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Enabled" />

            <button
              onClick={saveItem}
              disabled={itemSaving}
              className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
            >
              {itemSaving ? "Saving…" : selected ? "Save changes" : "Create item"}
            </button>
            {selected && (
              <button onClick={removeItem} className="w-full py-2 text-red-400 text-sm hover:underline flex items-center justify-center gap-1.5">
                <Trash2 size={14} /> Delete item
              </button>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title={`Top balances (${balances.length})`}>
            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {balances.map((b) => (
                <div key={b.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-gray-300">{b.displayName || <span className="text-gray-500 italic">Unknown member</span>}</span>
                  <span className="text-gray-400">{formatPrice(b.balance, config)}</span>
                </div>
              ))}
              {balances.length === 0 && <p className="text-sm text-gray-500">No one has any currency yet.</p>}
            </div>
          </Card>

          <Card title={`Recent purchases (${purchases.length})`}>
            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
              {purchases.map((p) => (
                <div key={p.id} className="py-2 text-sm">
                  <p className="text-gray-300">{p.itemName} <span className="text-gray-500">— {formatPrice(p.price, config)}</span></p>
                  <p className="text-xs text-gray-600">{new Date(p.purchasedAt).toLocaleString()}</p>
                </div>
              ))}
              {purchases.length === 0 && <p className="text-sm text-gray-500">No purchases yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
