import { Invoice, Item, CompanySettings, AppView } from "../types";
import { formatCurrency } from "../utils";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Plus,
  Settings as SettingsIcon,
  ShoppingBag,
  BookOpen,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface DashboardProps {
  invoices: Invoice[];
  items: Item[];
  settings: CompanySettings;
  onNavigate: (view: AppView) => void;
}

export default function Dashboard({
  invoices,
  items,
  settings,
  onNavigate,
}: DashboardProps) {
  const totalSales = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalReceivables = invoices.reduce((s, i) => s + i.balanceDue, 0);
  const totalCollected = totalSales - totalReceivables;
  const lowStockItems = items.filter((i) => i.stock <= 5);
  const latestInvoices = [...invoices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const maxAmount = Math.max(...invoices.map((i) => i.totalAmount), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Sales"
          value={formatCurrency(totalSales, settings.currency)}
          sub="All time revenue"
          icon={TrendingUp}
          color="emerald"
        />
        <KpiCard
          label="Amount Collected"
          value={formatCurrency(totalCollected, settings.currency)}
          sub="Settled invoices"
          icon={ArrowUpRight}
          color="teal"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(totalReceivables, settings.currency)}
          sub="Pending payments"
          icon={ArrowDownLeft}
          color="amber"
        />
        <KpiCard
          label="Inventory Items"
          value={`${items.length} Products`}
          sub={
            lowStockItems.length > 0
              ? `${lowStockItems.length} low on stock`
              : "All stock healthy"
          }
          icon={ShoppingBag}
          color={lowStockItems.length > 0 ? "red" : "blue"}
        />
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Sales Overview</h3>
              <p className="text-xs text-slate-400">Last {Math.min(invoices.length, 6)} invoices</p>
            </div>
            <button
              onClick={() => onNavigate("reports")}
              className="text-xs text-emerald-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              Full Reports <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-48 flex items-end gap-3 border-b border-dashed border-slate-200 pb-2 pt-4">
            {invoices.length === 0 ? (
              <div className="w-full flex items-center justify-center text-sm text-slate-400">
                Create invoices to see your sales chart.
              </div>
            ) : (
              invoices.slice(-6).map((inv, i) => {
                const pct = Math.max(10, (inv.totalAmount / maxAmount) * 100);
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
                  >
                    <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatCurrency(inv.totalAmount, settings.currency)}
                    </span>
                    <div
                      style={{ height: `${pct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500"
                    />
                    <span className="text-[9px] text-slate-400 truncate max-w-full font-mono">
                      {inv.invoiceNumber.split("-").slice(-1)[0]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard
              label="New Invoice"
              icon={Plus}
              color="emerald"
              onClick={() => onNavigate("add-invoice")}
            />
            <ActionCard
              label="Inventory"
              icon={ShoppingBag}
              color="teal"
              onClick={() => onNavigate("items")}
            />
            <ActionCard
              label="Reports"
              icon={BookOpen}
              color="amber"
              onClick={() => onNavigate("reports")}
            />
            <ActionCard
              label="Settings"
              icon={SettingsIcon}
              color="slate"
              onClick={() => onNavigate("settings")}
            />
          </div>

          {lowStockItems.length > 0 && (
            <div
              onClick={() => onNavigate("items")}
              className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Low Stock Alert</p>
                <p className="text-[10px] text-amber-700">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} need restocking.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent Transactions</h3>
          <button
            onClick={() => onNavigate("invoices")}
            className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
          >
            View All
          </button>
        </div>
        {latestInvoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No invoices yet. Create your first invoice to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-3 text-left">Invoice</th>
                <th className="px-6 py-3 text-left">Customer</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{inv.invoiceNumber}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">{inv.customerName}</td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">{inv.date}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                    {formatCurrency(inv.totalAmount, settings.currency)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-xl font-extrabold text-slate-900 block">{value}</span>
        <span className="text-[11px] text-slate-500 block">{sub}</span>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colors[color] || colors.slate}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function ActionCard({
  label,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200",
    teal: "bg-teal-100 text-teal-600 group-hover:bg-teal-200",
    amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
    slate: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
  };
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all cursor-pointer hover:shadow-sm"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${colors[color] || colors.slate}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </button>
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
