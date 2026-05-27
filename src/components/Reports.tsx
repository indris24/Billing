import { useState } from "react";
import { Invoice, CompanySettings } from "../types";
import { formatCurrency } from "../utils";
import { Download } from "lucide-react";

interface ReportsProps {
  invoices: Invoice[];
  settings: CompanySettings;
}

type MonthFilter = string;

export default function Reports({ invoices, settings }: ReportsProps) {
  const [filterMonth, setFilterMonth] = useState<MonthFilter>("All");

  const filtered = invoices.filter((inv) => {
    if (filterMonth === "All") return true;
    return new Date(inv.date).toLocaleString("default", { month: "long" }) === filterMonth;
  });

  const totalSales = filtered.reduce((s, i) => s + i.totalAmount, 0);
  const totalOutstanding = filtered.reduce((s, i) => s + i.balanceDue, 0);
  const totalCollected = totalSales - totalOutstanding;
  const avgBill = filtered.length > 0 ? totalSales / filtered.length : 0;

  const months = [
    "All",
    ...Array.from(
      new Set(
        invoices.map((inv) =>
          new Date(inv.date).toLocaleString("default", { month: "long" })
        )
      )
    ),
  ];

  const exportCSV = () => {
    let csv = "Invoice No,Date,Customer,Phone,Total,Balance,Status\n";
    filtered.forEach((inv) => {
      csv += `"${inv.invoiceNumber}","${inv.date}","${inv.customerName}","${inv.customerPhone || ""}",${inv.totalAmount},${inv.balanceDue},"${inv.paymentStatus}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Vpayar_Report_${filterMonth}_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reports & Day Book</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track revenue, collections and outstanding balances</p>
        </div>
        <div className="flex gap-2.5 items-center">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-xl px-3 py-2 cursor-pointer outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m === "All" ? "All Months" : m}
              </option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Billed" value={formatCurrency(totalSales, settings.currency)} sub="Gross revenue" accent="slate" />
        <StatCard label="Collected" value={formatCurrency(totalCollected, settings.currency)} sub="Settled payments" accent="emerald" />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding, settings.currency)} sub="Pending balances" accent="red" />
        <StatCard label="Avg Invoice" value={formatCurrency(avgBill, settings.currency)} sub={`${filtered.length} invoices`} accent="amber" />
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Sales Ledger — {filterMonth === "All" ? "All Time" : filterMonth}
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-slate-400">
            No invoices found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Collected</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => {
                  const collected = inv.totalAmount - inv.balanceDue;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.date}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatCurrency(inv.totalAmount, settings.currency)}</td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 font-semibold">{formatCurrency(collected, settings.currency)}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${inv.balanceDue > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue, settings.currency) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : inv.paymentStatus === "Partial"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-sm">
                  <td className="px-5 py-3 text-slate-600" colSpan={3}>Totals</td>
                  <td className="px-5 py-3 text-right text-slate-900">{formatCurrency(totalSales, settings.currency)}</td>
                  <td className="px-5 py-3 text-right text-emerald-600">{formatCurrency(totalCollected, settings.currency)}</td>
                  <td className="px-5 py-3 text-right text-red-600">{formatCurrency(totalOutstanding, settings.currency)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{label}</span>
      <div className={`text-xl font-extrabold mt-1 ${colors[accent] || colors.slate}`}>{value}</div>
      <span className="text-[11px] text-slate-400 block mt-0.5">{sub}</span>
    </div>
  );
}
