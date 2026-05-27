import React, { useState, useEffect } from "react";
import { CompanySettings } from "../types";
import { ShieldCheck, Mail, Phone, MapPin, Save, Settings as SettingsIcon } from "lucide-react";

interface SettingsProps {
  settings: CompanySettings;
  onUpdateSettings: (data: Partial<CompanySettings>) => Promise<void>;
}

export default function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [form, setForm] = useState<CompanySettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const set = (key: keyof CompanySettings, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onUpdateSettings(form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      alert("Failed to save settings. Check server connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-600" /> Company Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure your business details, tax information and invoice defaults.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Settings saved successfully.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 space-y-1.5">
            <label className={labelCls}>Business Name *</label>
            <input
              required
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className={`${inputCls} font-semibold text-base`}
              placeholder="Your company name"
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={`${inputCls} pl-9`} placeholder="Contact number" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={`${inputCls} pl-9`} placeholder="billing@yourcompany.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>GSTIN</label>
            <input
              value={form.gstin}
              onChange={(e) => set("gstin", e.target.value)}
              className={`${inputCls} font-mono tracking-widest`}
              placeholder="27AAPCV1234F1Z5"
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Currency Symbol</label>
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
              <option value="₹">₹  Indian Rupee (INR)</option>
              <option value="$">$  US Dollar (USD)</option>
              <option value="€">€  Euro (EUR)</option>
              <option value="£">£  British Pound (GBP)</option>
              <option value="¥">¥  Yen / Yuan</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Invoice Number Prefix</label>
            <input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} className={`${inputCls} font-mono`} placeholder="INV-2026-" />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className={labelCls}>Business Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                rows={2}
                className={`${inputCls} pl-9 resize-none`}
                placeholder="Full business address"
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className={labelCls}>Terms & Conditions (Invoice Footer)</label>
            <textarea
              value={form.terms}
              onChange={(e) => set("terms", e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder="1. Payment is due within 15 days of invoice date.&#10;2. Goods once sold will not be taken back."
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 px-6 rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelCls = "text-[10px] uppercase font-bold text-slate-400 block";
const inputCls =
  "w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none transition-all";
