import { Invoice, CompanySettings } from "../types";
import { formatCurrency, calculateInvoiceTotals } from "../utils";
import { X, Printer, MessageCircle, Clipboard } from "lucide-react";

interface InvoicePrintModalProps {
  invoice: Invoice;
  settings: CompanySettings;
  onClose: () => void;
  onShareWhatsApp: () => void;
}

export default function InvoicePrintModal({
  invoice,
  settings,
  onClose,
  onShareWhatsApp,
}: InvoicePrintModalProps) {
  const totals = calculateInvoiceTotals(
    invoice.items,
    invoice.taxType,
    invoice.additionalCharges,
    invoice.discountAmount
  );

  const handlePrint = () => {
    const content = document.getElementById("invoice-print-area")?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1e293b; font-size: 13px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px; }
            .company-name { font-size: 22px; font-weight: 700; }
            .meta { text-align: right; font-size: 12px; color: #475569; }
            .badge { background: #f0fdf4; color: #15803d; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: .05em; display: inline-block; margin-bottom: 6px; }
            .billing { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
            th { background: #f1f5f9; font-weight: 700; text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { display: flex; justify-content: flex-end; }
            .totals-box { width: 260px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total { font-size: 14px; font-weight: 700; color: #059669; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 4px; display: flex; justify-content: space-between; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; }
            .sig-line { width: 160px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; }
            @media print { button { display: none !important; } }
          </style>
        </head>
        <body>${content}<script>window.onload=()=>{window.print();window.close();}<\/script></body>
      </html>
    `);
    win.document.close();
  };

  const copyToClipboard = () => {
    const text = `Invoice ${invoice.invoiceNumber} | ${invoice.customerName} | Total: ${formatCurrency(invoice.totalAmount, settings.currency)} | ${invoice.paymentStatus}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900">Invoice Preview</h3>
            <p className="text-xs text-slate-400">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-2 shrink-0">
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
          <button onClick={onShareWhatsApp} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ml-auto">
            <Clipboard className="w-3.5 h-3.5" /> Copy Summary
          </button>
        </div>

        {/* Invoice content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
          <div
            id="invoice-print-area"
            className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 p-8 text-sm text-slate-800 shadow-sm"
          >
            {/* Top header */}
            <div className="header flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
              <div>
                <h1 className="company-name text-2xl font-bold text-slate-900">{settings.companyName}</h1>
                <p className="text-xs text-slate-500 max-w-xs mt-1 whitespace-pre-line">{settings.address}</p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                  {settings.phone && <div>Phone: {settings.phone}</div>}
                  {settings.email && <div>Email: {settings.email}</div>}
                  {settings.gstin && <div className="font-semibold text-emerald-700">GSTIN: {settings.gstin}</div>}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-emerald-50 text-emerald-700 font-extrabold text-xs px-3 py-1.5 rounded uppercase tracking-wider">
                  Tax Invoice
                </span>
                <div className="mt-3 space-y-0.5 text-xs text-slate-600">
                  <div className="font-bold text-sm text-slate-900">{invoice.invoiceNumber}</div>
                  <div>Date: {invoice.date}</div>
                  {invoice.dueDate && <div>Due: {invoice.dueDate}</div>}
                  <div className={`font-semibold ${invoice.paymentStatus === "Paid" ? "text-emerald-600" : "text-red-600"}`}>
                    {invoice.paymentStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing block */}
            <div className="billing grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-6">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Billed To</span>
                <div className="font-semibold text-slate-900">{invoice.customerName}</div>
                {invoice.customerPhone && <div className="text-xs text-slate-500">📱 {invoice.customerPhone}</div>}
                {invoice.customerAddress && <div className="text-xs text-slate-500 mt-1">{invoice.customerAddress}</div>}
              </div>
            </div>

            {/* Items table */}
            <table className="w-full border-collapse border border-slate-200 text-xs mb-4">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-2.5 border border-slate-200">#</th>
                  <th className="p-2.5 border border-slate-200 text-left">Item</th>
                  <th className="p-2.5 border border-slate-200 text-right">Price</th>
                  <th className="p-2.5 border border-slate-200 text-center">Qty</th>
                  {totals.discountTotal > 0 && <th className="p-2.5 border border-slate-200 text-right">Disc%</th>}
                  {invoice.items.some((i) => i.gstRate > 0) && <th className="p-2.5 border border-slate-200 text-center">GST%</th>}
                  <th className="p-2.5 border border-slate-200 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const net = item.price * (1 - (item.discount || 0) / 100);
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-2.5 border border-slate-200 text-center">{idx + 1}</td>
                      <td className="p-2.5 border border-slate-200 font-medium">{item.name}</td>
                      <td className="p-2.5 border border-slate-200 text-right">{formatCurrency(item.price, settings.currency)}</td>
                      <td className="p-2.5 border border-slate-200 text-center">{item.quantity}</td>
                      {totals.discountTotal > 0 && <td className="p-2.5 border border-slate-200 text-right">{item.discount ? `${item.discount}%` : "—"}</td>}
                      {invoice.items.some((i) => i.gstRate > 0) && <td className="p-2.5 border border-slate-200 text-center">{item.gstRate}%</td>}
                      <td className="p-2.5 border border-slate-200 text-right font-medium">{formatCurrency(net * item.quantity, settings.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals + notes */}
            <div className="flex justify-between items-start gap-6">
              <div className="flex-1 text-xs text-slate-500 space-y-3">
                {invoice.notes && (
                  <div>
                    <p className="font-semibold text-slate-700 mb-0.5">Notes</p>
                    <p className="italic bg-slate-50 p-2 rounded border border-slate-100">{invoice.notes}</p>
                  </div>
                )}
                {settings.terms && (
                  <div>
                    <p className="font-semibold text-slate-700 mb-0.5">Terms & Conditions</p>
                    <p className="whitespace-pre-line text-[10px] leading-relaxed">{settings.terms}</p>
                  </div>
                )}
              </div>
              <div className="w-60 text-xs shrink-0">
                <TRow label="Subtotal" value={formatCurrency(totals.subtotal, settings.currency)} />
                <TRow label={`GST (${invoice.taxType})`} value={formatCurrency(totals.taxTotal, settings.currency)} />
                {invoice.additionalCharges > 0 && <TRow label="Charges" value={formatCurrency(invoice.additionalCharges, settings.currency)} />}
                {invoice.discountAmount > 0 && <TRow label="Discount" value={`−${formatCurrency(invoice.discountAmount, settings.currency)}`} />}
                {totals.autoRoundOff !== 0 && <TRow label="Round Off" value={(totals.autoRoundOff > 0 ? "+" : "") + totals.autoRoundOff} muted />}
                <div className="flex justify-between border-t-2 border-slate-300 pt-2 mt-1 font-bold text-sm">
                  <span>Grand Total</span>
                  <span className="text-emerald-700 font-mono">{formatCurrency(totals.grandTotal, settings.currency)}</span>
                </div>
                {invoice.balanceDue > 0 && (
                  <div className="flex justify-between mt-1 text-red-600 font-semibold">
                    <span>Balance Due</span>
                    <span className="font-mono">{formatCurrency(invoice.balanceDue, settings.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-5 border-t border-slate-100 flex justify-between items-end">
              <p className="text-xs text-slate-400">Thank you for your business.</p>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700 mb-8">For {settings.companyName}</p>
                <div className="inline-block border-t border-slate-400 w-40 text-center text-xs text-slate-500 pt-1">
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-1 border-b border-slate-100 ${muted ? "text-slate-400" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
