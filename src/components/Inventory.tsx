import React, { useState } from "react";
import { Item, CompanySettings } from "../types";
import { formatCurrency } from "../utils";
import {
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

interface InventoryProps {
  items: Item[];
  settings: CompanySettings;
  onAddItem: (data: Omit<Item, "id">) => Promise<void>;
  onUpdateItem: (id: string, data: Partial<Item>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export default function Inventory({
  items,
  settings,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: InventoryProps) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // New item form
  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [isbn, setIsbn] = useState("");
  const [stock, setStock] = useState("");
  const [gstRate, setGstRate] = useState("18");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Item name is required."); return; }
    try {
      setSaving(true);
      await onAddItem({
        name,
        salePrice: parseFloat(salePrice) || 0,
        purchasePrice: parseFloat(purchasePrice) || 0,
        isbn,
        stock: parseInt(stock) || 0,
        gstRate: parseFloat(gstRate) || 0,
      });
      setName(""); setSalePrice(""); setPurchasePrice(""); setIsbn(""); setStock(""); setGstRate("18");
      setShowForm(false); setErr("");
    } catch {
      setErr("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditPrice(item.salePrice);
    setEditStock(item.stock);
  };

  const saveEdit = async (item: Item) => {
    try {
      await onUpdateItem(item.id, { salePrice: editPrice, stock: editStock });
      setEditingId(null);
    } catch {
      alert("Failed to update item.");
    }
  };

  const filtered = items.filter(
    (it) =>
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.isbn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Items & Inventory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {items.length} products · {items.filter((i) => i.stock <= 5).length} low stock
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> {showForm ? "Close Form" : "Add New Item"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">New Product</h3>
          {err && <p className="text-sm font-medium text-red-600">{err}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Sale Price</label>
              <input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Purchase Cost</label>
              <input type="number" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Code / Barcode</label>
              <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="SKU / Barcode" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Stock Qty</label>
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">GST %</label>
              <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} className={inputCls}>
                <option value="0">0% — Exempt</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl cursor-pointer disabled:opacity-50 transition-colors h-9 col-span-2 md:col-span-1"
            >
              <Plus className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl pl-9 pr-3 py-2 text-sm outline-none text-slate-800"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">{filtered.length} products</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">
              {search ? "No products matched your search." : "No products yet. Add your first item above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Code</th>
                  <th className="px-5 py-3 text-left">Product Name</th>
                  <th className="px-5 py-3 text-center">Stock</th>
                  <th className="px-5 py-3 text-right">Sale Price</th>
                  <th className="px-5 py-3 text-right">Cost</th>
                  <th className="px-5 py-3 text-right">Margin</th>
                  <th className="px-5 py-3 text-center">GST</th>
                  <th className="px-5 py-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const profit = item.salePrice - item.purchasePrice;
                  const margin = item.purchasePrice > 0 ? (profit / item.purchasePrice) * 100 : 0;
                  const isLow = item.stock <= 5;
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">{item.isbn || "—"}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-5 py-3.5 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                            className="w-16 text-center bg-slate-100 border border-emerald-300 rounded py-0.5 text-sm outline-none"
                          />
                        ) : (
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${isLow ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                              {isLow && <AlertTriangle className="w-3 h-3" />}
                              {item.stock} units
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                            className="w-24 text-right bg-slate-100 border border-emerald-300 rounded py-0.5 px-1 text-sm outline-none"
                          />
                        ) : formatCurrency(item.salePrice, settings.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500">{formatCurrency(item.purchasePrice, settings.currency)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-bold text-xs ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(profit, settings.currency)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{margin.toFixed(0)}% markup</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-teal-700 text-xs">{item.gstRate}%</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(item)} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors" title="Save">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors" title="Cancel">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(item)} className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors" title="Edit price/stock">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { if (window.confirm(`Remove "${item.name}" from inventory?`)) onDeleteItem(item.id); }}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-lg px-3 py-1.5 text-sm text-slate-800 outline-none transition-all";
