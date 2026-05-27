import React, { useState, useEffect } from "react";
import { Item, InvoiceItem, Invoice, CompanySettings, AppView } from "../types";
import { calculateInvoiceTotals, formatCurrency } from "../utils";
import { Plus, Trash2, Percent, Save, AlertCircle, ArrowLeft } from "lucide-react";

interface InvoiceFormProps {
  items: Item[];
  settings: CompanySettings;
  invoices: Invoice[];
  onSaveInvoice: (data: Omit<Invoice, "id">) => Promise<void>;
  onNavigate: (view: AppView) => void;
}

export default function InvoiceForm({
  items,
  settings,
  invoices,
  onSaveInvoice,
  onNavigate,
}: InvoiceFormProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [taxType, setTaxType] = useState<"inclusive" | "exclusive">("exclusive");
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Unpaid" | "Partial">("Unpaid");
  const [amountPaid, setAmountPaid] = useState(0);
  const [currentItemId, setCurrentItemId] = useState("");
  const [currentQty, setCurrentQty] = useState(1);
  const [currentDisc, setCurrentDisc] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setInvoiceNumber(`${settings.invoicePrefix || "INV-2026-"}${invoices.length + 101}`);
  }, [invoices, settings]);

  const totals = calculateInvoiceTotals(selectedItems, taxType, additionalCharges, discountAmount);

  useEffect(() => {
    if (paymentStatus === "Paid") setAmountPaid(totals.roundedFinal);
    else if (paymentStatus === "Unpaid") setAmountPaid(0);
  }, [paymentStatus, totals.roundedFinal]);

  const balanceDue = Math.max(0, totals.roundedFinal - amountPaid);

  const addItem = () => {
    if (!currentItemId) { setError("Please select a product."); return; }
    const item = items.find((i) => i.id === currentItemId);
    if (!item) return;
    const idx = selectedItems.findIndex((i) => i.itemId === currentItemId);
    const updated = [...selectedItems];
    if (idx !== -1) {
      updated[idx].quantity += currentQty;
    } else {
      updated.push({ itemId: item.id, name: item.name, price: item.salePrice, quantity: currentQty, gstRate: item.gstRate, discount: currentDisc });
    }
    setSelectedItems(updated);
    setCurrentItemId(""); setCurrentQty(1); setCurrentDisc(0); setError("");
  };

  const removeItem = (i: number) => setSelectedItems(selectedItems.filter((_, idx) => idx !== i));
  const updateQty = (i: number, qty: number) => {
    const u = [...selectedItems]; u[i].quantity = Math.max(1, qty); setSelectedItems(u);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!customerName.trim()) { setError("Customer name is required."); return; }
    if (selectedItems.length === 0) { setError("Add at least one item to the invoice."); return; }
    try {
      setSaving(true);
      await onSaveInvoice({ invoiceNumber, date, dueDate, customerName, customerPhone, customerAddress, items: selectedItems, taxType, additionalCharges, discountAmount, roundOff: totals.autoRoundOff, totalAmount: totals.roundedFinal, balanceDue, paymentStatus, notes });
      onNavigate("invoices");
    } catch {
      setError("Failed to save invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-6xl">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate("invoices")}
          className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Create New Invoice</h2>
          <p className="text-xs text-slate-400">Fill in customer details, products and payment information</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <Section title="Customer Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Customer Name *">
                <Input
                  required
                  placeholder="Customer or business name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </Field>
              <Field label="Phone Number">
                <Input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </Field>
              <Field label="Billing Address" className="md:col-span-2">
                <textarea
                  placeholder="Complete billing address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none transition-all resize-none"
                />
              </Field>
            </div>
          </Section>

          {/* Products */}
          <Section title="Products">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-48">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Product</label>
                <select
                  value={currentItemId}
                  onChange={(e) => setCurrentItemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
                >
                  <option value="">— Select product —</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({formatCurrency(it.salePrice, settings.currency)} · Stock: {it.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty</label>
                <Input type="number" min="1" value={currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value) || 1)} className="text-center" />
              </div>
              <div className="w-24">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  Disc <Percent className="w-3 h-3" />
                </label>
                <Input type="number" min="0" max="100" value={currentDisc} onChange={(e) => setCurrentDisc(parseFloat(e.target.value) || 0)} className="text-center" />
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer h-9"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {selectedItems.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left">#</th>
                      <th className="px-4 py-2.5 text-left">Item</th>
                      <th className="px-4 py-2.5 text-right">Price</th>
                      <th className="px-4 py-2.5 text-center">Qty</th>
                      <th className="px-4 py-2.5 text-right">Disc%</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item, i) => {
                      const net = item.price * (1 - (item.discount || 0) / 100);
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(item.price, settings.currency)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQty(i, parseInt(e.target.value) || 1)}
                              className="w-14 text-center bg-slate-100 border-none rounded py-0.5 text-sm outline-none"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-500">{item.discount ? `${item.discount}%` : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(net * item.quantity, settings.currency)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Notes */}
          <Section title="Notes & Remarks">
            <textarea
              placeholder="Additional notes, terms or delivery instructions (printed on invoice)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none transition-all resize-none"
            />
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Invoice Meta */}
          <Section title="Invoice Details">
            <div className="space-y-4">
              <Field label="Invoice Number">
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required className="font-mono font-semibold" />
              </Field>
              <Field label="Invoice Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Due Date">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Adjustments */}
          <Section title="Adjustments">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">GST Type</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                  {(["exclusive", "inclusive"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTaxType(t)}
                      className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-colors cursor-pointer ${taxType === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Shipping / Charges</span>
                <CurrencyInput
                  currency={settings.currency}
                  value={additionalCharges}
                  onChange={(v) => setAdditionalCharges(v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Overall Discount</span>
                <CurrencyInput
                  currency={settings.currency}
                  value={discountAmount}
                  onChange={(v) => setDiscountAmount(v)}
                />
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 mt-2">
                <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal, settings.currency)} />
                <TotalRow label="GST Total" value={formatCurrency(totals.taxTotal, settings.currency)} />
                {totals.autoRoundOff !== 0 && (
                  <TotalRow label="Round Off" value={(totals.autoRoundOff > 0 ? "+" : "") + totals.autoRoundOff} muted />
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-emerald-600 text-base font-mono">{formatCurrency(totals.roundedFinal, settings.currency)}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Payment */}
          <Section title="Payment Status">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(["Paid", "Unpaid", "Partial"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPaymentStatus(s)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${paymentStatus === s ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {paymentStatus === "Partial" && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Amount Received</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">{settings.currency}</span>
                    <input
                      type="number"
                      min="0"
                      max={totals.roundedFinal}
                      value={amountPaid || ""}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-sm font-mono outline-none"
                    />
                  </div>
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    Balance due: {formatCurrency(balanceDue, settings.currency)}
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onNavigate("invoices")}
              className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Invoice"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[10px] uppercase font-bold text-slate-400 block">{label}</label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none transition-all ${className}`}
    />
  );
}

function CurrencyInput({ currency, value, onChange }: { currency: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative w-28">
      <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-400">{currency}</span>
      <input
        type="number"
        min="0"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-right rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-800 outline-none"
      />
    </div>
  );
}

function TotalRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-xs ${muted ? "text-slate-400" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}
