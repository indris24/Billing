import { useState, useEffect } from "react";
import { Item, Invoice, CompanySettings, AppView } from "./types";
import { generateWhatsAppLink } from "./utils";
import Dashboard from "./components/Dashboard";
import InvoiceList from "./components/InvoiceList";
import InvoiceForm from "./components/InvoiceForm";
import Inventory from "./components/Inventory";
import Settings from "./components/Settings";
import Reports from "./components/Reports";
import InvoicePrintModal from "./components/InvoicePrintModal";
import {
  Home,
  FileText,
  Plus,
  ShoppingBag,
  BarChart2,
  Settings as SettingsIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { view: "dashboard" as AppView, label: "Dashboard", icon: Home },
  { view: "invoices" as AppView, label: "Invoices", icon: FileText },
  { view: "items" as AppView, label: "Items & Stock", icon: ShoppingBag },
  { view: "reports" as AppView, label: "Reports", icon: BarChart2 },
  { view: "settings" as AppView, label: "Settings", icon: SettingsIcon },
];

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("dashboard");

  const [settings, setSettings] = useState<CompanySettings>({
    companyName: "Vpayar India Solutions",
    phone: "9876543210",
    email: "billing@vpayar.in",
    gstin: "27AAPCV1234F1Z5",
    address: "123 Business Park, Tech Zone, Mumbai, 400001",
    currency: "₹",
    invoicePrefix: "INV-2026-",
    terms: "",
  });
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, itemsRes, invoicesRes] = await Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/items").then((r) => r.json()),
        fetch("/api/invoices").then((r) => r.json()),
      ]);
      if (settingsRes?.companyName) setSettings(settingsRes);
      if (Array.isArray(itemsRes)) setItems(itemsRes);
      if (Array.isArray(invoicesRes)) setInvoices(invoicesRes);
    } catch (err) {
      console.error("Failed to load data from backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSettings = async (data: Partial<CompanySettings>) => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setSettings(updated);
  };

  const handleAddItem = async (data: Omit<Item, "id">) => {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const newItem = await res.json();
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = async (id: string, data: Partial<Item>) => {
    const res = await fetch(`/api/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  };

  const handleDeleteItem = async (id: string) => {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSaveInvoice = async (data: Omit<Invoice, "id">) => {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const newInvoice = await res.json();
    setInvoices((prev) => [...prev, newInvoice]);
    // Refresh items to reflect reduced stock
    const updatedItems = await fetch("/api/items").then((r) => r.json());
    if (Array.isArray(updatedItems)) setItems(updatedItems);
  };

  const handleDeleteInvoice = async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  const triggerWhatsApp = (invoice: Invoice) => {
    const url = generateWhatsAppLink(invoice, settings);
    window.open(url, "_blank");
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-32">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading your data…</p>
        </div>
      );
    }

    switch (currentView) {
      case "dashboard":
        return (
          <Dashboard
            invoices={invoices}
            items={items}
            settings={settings}
            onNavigate={setCurrentView}
          />
        );
      case "invoices":
        return (
          <InvoiceList
            invoices={invoices}
            settings={settings}
            onNavigate={setCurrentView}
            onSelectInvoice={setSelectedInvoice}
            onDeleteInvoice={handleDeleteInvoice}
          />
        );
      case "add-invoice":
        return (
          <InvoiceForm
            items={items}
            settings={settings}
            invoices={invoices}
            onSaveInvoice={handleSaveInvoice}
            onNavigate={setCurrentView}
          />
        );
      case "items":
        return (
          <Inventory
            items={items}
            settings={settings}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        );
      case "settings":
        return (
          <Settings settings={settings} onUpdateSettings={handleUpdateSettings} />
        );
      case "reports":
        return <Reports invoices={invoices} settings={settings} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* ── Sidebar ── */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-base shadow-lg shadow-emerald-900/40">
              V
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white leading-none">Vpayar</h1>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">
                Billing Suite
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
            const active =
              currentView === view ||
              (view === "invoices" && currentView === "add-invoice");
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* New Invoice CTA */}
        <div className="px-3 pb-5">
          <button
            onClick={() => setCurrentView("add-invoice")}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-emerald-900/25 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>

        {/* Company tag */}
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 font-medium truncate">{settings.companyName}</p>
          <p className="text-[10px] text-slate-600 truncate">{settings.email}</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {currentView === "add-invoice"
                ? "New Invoice"
                : currentView.replace("-", " ")}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Connected</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">
          {renderView()}
        </main>
      </div>

      {/* Invoice print modal */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
          onShareWhatsApp={() => triggerWhatsApp(selectedInvoice)}
        />
      )}
    </div>
  );
}
