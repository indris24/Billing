import { useState } from "react";
import { Invoice, CompanySettings, AppView } from "../types";
import { formatCurrency, generateWhatsAppLink } from "../utils";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  MessageCircle,
  AlertCircle,
} from "lucide-react";

interface InvoiceListProps {
  invoices: Invoice[];
  settings: CompanySettings;
  onNavigate: (view: AppView) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => Promise<void>;
}

type StatusFilter = "All" | "Paid" | "Unpaid" | "Partial";

export default function InvoiceList({
  invoices,
  settings,
  onNavigate,
  onSelectInvoice,
  onDeleteInvoice,
}: InvoiceListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch =
      inv.customerName.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerPhone && inv.customerPhone.includes(q));
    const matchStatus = filter === "All" || inv.paymentStatus === filter;
    return matchSearch && matchStatus;
  });

  const shareWhatsApp = (inv: Invoice) => {
    window.open(generateWhatsAppLink(inv, settings), "_blank");
  };

  const confirmDelete = (id: string) => {
    if (window.confirm("Delete this invoice permanently?")) {
      onDeleteInvoice(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Sale Invoices</h2>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.length} invoices total</p>
        </div>
        <button
          onClick={() => onNavigate("add-invoice")}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, phone or invoice number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex bg-white border border-slate-200 shadow-sm rounded-xl p-1 gap-1 shrink-0">
          {(["All", "Paid", "Unpaid", "Partial"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === s
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-20 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No Invoices Found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            {search || filter !== "All"
              ? "No results match your filters. Try adjusting your search."
              : "You haven't created any invoices yet."}
          </p>
          {!search && filter === "All" && (
            <button
              onClick={() => onNavigate("add-invoice")}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create First Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Due Date</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{inv.customerName}</div>
                      {inv.customerPhone && (
                        <div className="text-[11px] text-slate-400">{inv.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.date}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.dueDate || "—"}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount, settings.currency)}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold text-xs ${inv.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue, settings.currency) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionBtn
                          title="Preview & Print"
                          onClick={() => onSelectInvoice(inv)}
                          color="slate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title="Send via WhatsApp"
                          onClick={() => shareWhatsApp(inv)}
                          color="emerald"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title="Delete Invoice"
                          onClick={() => confirmDelete(inv.id)}
                          color="red"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Paid"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "Partial"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-red-50 text-red-700 border-red-100";
  return (
    <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  color,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  color: "slate" | "emerald" | "red";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
    red: "bg-red-50 text-red-600 hover:bg-red-100",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${colors[color]}`}
    >
      {children}
    </button>
  );
}
