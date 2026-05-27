import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");

const FILES = {
  settings: path.join(DATA_DIR, "settings.json"),
  items:     path.join(DATA_DIR, "items.json"),
  customers: path.join(DATA_DIR, "customers.json"),
  invoices:  path.join(DATA_DIR, "invoices.json"),
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeFile(file: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function defaultSettings() {
  return {
    companyName: "JDS Traders",
    tagline: "Quality You Can Trust — Since 2014",
    phone: "9876543210",
    email: "billing@jdstraders.in",
    gstin: "27AAJPJ1234F1Z5",
    address: "JDS Traders, Main Bazaar Road, Chennai, Tamil Nadu - 600001",
    currency: "₹",
    invoicePrefix: "JDS-2026-",
    terms: "1. Goods once sold will not be taken back.\n2. Please verify items before leaving the counter.",
  };
}

// Seed defaults if missing
function seedDefaults() {
  ensureDataDir();
  if (!fs.existsSync(FILES.settings)) writeFile(FILES.settings, defaultSettings());
  if (!fs.existsSync(FILES.items))    writeFile(FILES.items, []);
  if (!fs.existsSync(FILES.customers)) writeFile(FILES.customers, []);
  if (!fs.existsSync(FILES.invoices))  writeFile(FILES.invoices, []);
}

// ── Simple XLSX builder (no external dep) ─────────────────────────────────────
// Produces a minimal but valid Office Open XML .xlsx using only Node built-ins.
import zlib from "zlib";

function escapeXml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xlsxCell(value: unknown, colIdx: number, rowIdx: number): string {
  const addr = String.fromCharCode(65 + colIdx) + rowIdx;
  const v = value ?? "";
  if (typeof v === "number") {
    return `<c r="${addr}" t="n"><v>${v}</v></c>`;
  }
  const sv = String(v);
  // inline string
  return `<c r="${addr}" t="inlineStr"><is><t>${escapeXml(sv)}</t></is></c>`;
}

function buildXlsx(sheets: { name: string; rows: unknown[][] }[]): Buffer {
  // Build sheet XML strings
  const sheetXmls: string[] = sheets.map(({ rows }) => {
    const rowsXml = rows
      .map((cols, ri) => {
        const cellsXml = cols.map((v, ci) => xlsxCell(v, ci, ri + 1)).join("");
        return `<row r="${ri + 1}">${cellsXml}</row>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;
  });

  // workbook.xml
  const sheetsRef = sheets
    .map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("");
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetsRef}</sheets></workbook>`;

  // workbook rels
  const wbRelsEntries = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join("");
  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRelsEntries}</Relationships>`;

  // [Content_Types].xml
  const sheetContentTypes = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetContentTypes}</Types>`;

  // _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  // Build zip (PK format manually)
  const entries: { name: string; data: Buffer }[] = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml) },
    { name: "_rels/.rels", data: Buffer.from(rootRelsXml) },
    { name: "xl/workbook.xml", data: Buffer.from(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRelsXml) },
    ...sheetXmls.map((xml, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: Buffer.from(xml),
    })),
  ];

  // Simple store-only ZIP (no compression) — works in all Excel/LibreOffice
  const parts: Buffer[] = [];
  const offsets: number[] = [];
  let offset = 0;

  function dosTime(): [number, number] {
    const now = new Date();
    const t = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1));
    const d = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate());
    return [t, d];
  }

  const [modTime, modDate] = dosTime();

  for (const entry of entries) {
    offsets.push(offset);
    const nameBytes = Buffer.from(entry.name);
    const crc = crc32(entry.data);
    // Local file header
    const lh = Buffer.alloc(30 + nameBytes.length);
    lh.writeUInt32LE(0x04034b50, 0); // sig
    lh.writeUInt16LE(20, 4);          // version
    lh.writeUInt16LE(0, 6);           // flags
    lh.writeUInt16LE(0, 8);           // stored
    lh.writeUInt16LE(modTime, 10);
    lh.writeUInt16LE(modDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(entry.data.length, 18);
    lh.writeUInt32LE(entry.data.length, 22);
    lh.writeUInt16LE(nameBytes.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBytes.copy(lh, 30);
    parts.push(lh);
    parts.push(entry.data);
    offset += lh.length + entry.data.length;
  }

  // Central directory
  const cdParts: Buffer[] = [];
  let cdSize = 0;
  const cdOffset = offset;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const nameBytes = Buffer.from(entry.name);
    const crc = crc32(entry.data);
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(modTime, 12);
    cd.writeUInt16LE(modDate, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(entry.data.length, 20);
    cd.writeUInt32LE(entry.data.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offsets[i], 42);
    nameBytes.copy(cd, 46);
    cdParts.push(cd);
    cdSize += cd.length;
  }

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, ...cdParts, eocd]);
}

// CRC32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  seedDefaults();
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // ── Settings ──────────────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    res.json(readFile(FILES.settings, defaultSettings()));
  });
  app.post("/api/settings", (req, res) => {
    const current = readFile(FILES.settings, defaultSettings());
    const updated = { ...current, ...req.body };
    writeFile(FILES.settings, updated);
    res.json(updated);
  });

  // ── Items ──────────────────────────────────────────────────────────────────
  app.get("/api/items", (_req, res) => res.json(readFile<any[]>(FILES.items, [])));
  app.post("/api/items", (req, res) => {
    const items = readFile<any[]>(FILES.items, []);
    const item = {
      id: "item-" + Date.now(),
      name: req.body.name || "Unnamed Item",
      salePrice: parseFloat(req.body.salePrice) || 0,
      purchasePrice: parseFloat(req.body.purchasePrice) || 0,
      isbn: req.body.isbn || "",
      stock: parseInt(req.body.stock) || 0,
      gstRate: parseFloat(req.body.gstRate) || 0,
      category: req.body.category || "",
    };
    items.push(item);
    writeFile(FILES.items, items);
    res.json(item);
  });
  app.put("/api/items/:id", (req, res) => {
    const items = readFile<any[]>(FILES.items, []);
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    items[idx] = { ...items[idx], ...req.body };
    writeFile(FILES.items, items);
    res.json(items[idx]);
  });
  app.delete("/api/items/:id", (req, res) => {
    let items = readFile<any[]>(FILES.items, []);
    items = items.filter((i) => i.id !== req.params.id);
    writeFile(FILES.items, items);
    res.json({ success: true });
  });

  // ── Customers ─────────────────────────────────────────────────────────────
  app.get("/api/customers", (_req, res) => res.json(readFile<any[]>(FILES.customers, [])));
  app.post("/api/customers", (req, res) => {
    const customers = readFile<any[]>(FILES.customers, []);
    const customer = {
      id: "cust-" + Date.now(),
      name: req.body.name || "Unknown",
      phone: req.body.phone || "",
      email: req.body.email || "",
      address: req.body.address || "",
      gstin: req.body.gstin || "",
      createdAt: new Date().toISOString().split("T")[0],
    };
    customers.push(customer);
    writeFile(FILES.customers, customers);
    res.json(customer);
  });
  app.put("/api/customers/:id", (req, res) => {
    const customers = readFile<any[]>(FILES.customers, []);
    const idx = customers.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    customers[idx] = { ...customers[idx], ...req.body };
    writeFile(FILES.customers, customers);
    res.json(customers[idx]);
  });
  app.delete("/api/customers/:id", (req, res) => {
    let customers = readFile<any[]>(FILES.customers, []);
    customers = customers.filter((c) => c.id !== req.params.id);
    writeFile(FILES.customers, customers);
    res.json({ success: true });
  });

  // ── Invoices ──────────────────────────────────────────────────────────────
  app.get("/api/invoices", (_req, res) => res.json(readFile<any[]>(FILES.invoices, [])));
  app.post("/api/invoices", (req, res) => {
    const invoices = readFile<any[]>(FILES.invoices, []);
    const settings = readFile<any>(FILES.settings, defaultSettings());
    const items = readFile<any[]>(FILES.items, []);

    const invoice = {
      id: "INV-" + Date.now(),
      invoiceNumber: req.body.invoiceNumber || `${settings.invoicePrefix || "JDS-"}${invoices.length + 101}`,
      date: req.body.date || new Date().toISOString().split("T")[0],
      dueDate: req.body.dueDate || "",
      customerId: req.body.customerId || "",
      customerName: req.body.customerName || "Walk-in Customer",
      customerPhone: req.body.customerPhone || "",
      customerAddress: req.body.customerAddress || "",
      items: req.body.items || [],
      taxType: req.body.taxType || "exclusive",
      additionalCharges: parseFloat(req.body.additionalCharges) || 0,
      discountAmount: parseFloat(req.body.discountAmount) || 0,
      roundOff: parseFloat(req.body.roundOff) || 0,
      totalAmount: parseFloat(req.body.totalAmount) || 0,
      balanceDue: parseFloat(req.body.balanceDue) ?? parseFloat(req.body.totalAmount) ?? 0,
      paymentStatus: req.body.paymentStatus || "Unpaid",
      notes: req.body.notes || "",
    };

    // Deduct stock
    if (Array.isArray(invoice.items)) {
      invoice.items.forEach((li: any) => {
        const dbItem = items.find((it: any) => it.id === li.itemId);
        if (dbItem) dbItem.stock = Math.max(0, dbItem.stock - (parseInt(li.quantity) || 0));
      });
      writeFile(FILES.items, items);
    }

    invoices.push(invoice);
    writeFile(FILES.invoices, invoices);
    res.json(invoice);
  });
  app.put("/api/invoices/:id", (req, res) => {
    const invoices = readFile<any[]>(FILES.invoices, []);
    const idx = invoices.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    invoices[idx] = { ...invoices[idx], ...req.body };
    writeFile(FILES.invoices, invoices);
    res.json(invoices[idx]);
  });
  app.delete("/api/invoices/:id", (req, res) => {
    let invoices = readFile<any[]>(FILES.invoices, []);
    invoices = invoices.filter((i) => i.id !== req.params.id);
    writeFile(FILES.invoices, invoices);
    res.json({ success: true });
  });

  // ── Excel Export ──────────────────────────────────────────────────────────
  // GET /api/export/excel?month=2026-05   (or omit month for all)
  app.get("/api/export/excel", (req, res) => {
    const invoices = readFile<any[]>(FILES.invoices, []);
    const items    = readFile<any[]>(FILES.items, []);
    const customers = readFile<any[]>(FILES.customers, []);
    const monthFilter = (req.query.month as string) || "";

    const filtered = monthFilter
      ? invoices.filter((inv) => inv.date && inv.date.startsWith(monthFilter))
      : invoices;

    // Sheet 1: Transactions
    const txHeader = ["Invoice #", "Date", "Due Date", "Customer", "Phone", "Address", "Items Count", "Subtotal", "GST", "Charges", "Discount", "Round Off", "Grand Total", "Balance Due", "Status", "Notes"];
    const txRows: unknown[][] = filtered.map((inv) => [
      inv.invoiceNumber,
      inv.date,
      inv.dueDate || "",
      inv.customerName,
      inv.customerPhone || "",
      inv.customerAddress || "",
      (inv.items || []).length,
      (inv.items || []).reduce((s: number, it: any) => s + it.price * it.quantity * (1 - (it.discount || 0) / 100), 0).toFixed(2),
      inv.totalAmount - (inv.items || []).reduce((s: number, it: any) => s + it.price * it.quantity * (1 - (it.discount || 0) / 100), 0),
      inv.additionalCharges || 0,
      inv.discountAmount || 0,
      inv.roundOff || 0,
      inv.totalAmount || 0,
      inv.balanceDue || 0,
      inv.paymentStatus,
      inv.notes || "",
    ]);

    // Sheet 2: Item Lines
    const ilHeader = ["Invoice #", "Date", "Customer", "Item Name", "Item Code", "Price", "Qty", "Discount%", "GST%", "Line Total"];
    const ilRows: unknown[][] = [];
    filtered.forEach((inv) => {
      (inv.items || []).forEach((li: any) => {
        const net = li.price * (1 - (li.discount || 0) / 100);
        ilRows.push([
          inv.invoiceNumber,
          inv.date,
          inv.customerName,
          li.name,
          li.itemId,
          li.price,
          li.quantity,
          li.discount || 0,
          li.gstRate || 0,
          +(net * li.quantity).toFixed(2),
        ]);
      });
    });

    // Sheet 3: Per-Customer Summary
    const custMap: Record<string, { name: string; phone: string; invoices: number; total: number; collected: number; outstanding: number }> = {};
    filtered.forEach((inv) => {
      const k = inv.customerName;
      if (!custMap[k]) custMap[k] = { name: k, phone: inv.customerPhone || "", invoices: 0, total: 0, collected: 0, outstanding: 0 };
      custMap[k].invoices += 1;
      custMap[k].total += inv.totalAmount || 0;
      custMap[k].outstanding += inv.balanceDue || 0;
      custMap[k].collected += (inv.totalAmount || 0) - (inv.balanceDue || 0);
    });
    const csHeader = ["Customer", "Phone", "Invoices", "Total Billed", "Collected", "Outstanding"];
    const csRows: unknown[][] = Object.values(custMap).map((c) => [
      c.name, c.phone, c.invoices,
      +c.total.toFixed(2), +c.collected.toFixed(2), +c.outstanding.toFixed(2),
    ]);

    // Sheet 4: Stock Status
    const stHeader = ["Item Code", "Name", "Category", "Sale Price", "Purchase Price", "Stock Qty", "Stock Value (Cost)", "GST %"];
    const stRows: unknown[][] = items.map((it) => [
      it.isbn || "",
      it.name,
      it.category || "",
      it.salePrice,
      it.purchasePrice,
      it.stock,
      +(it.purchasePrice * it.stock).toFixed(2),
      it.gstRate,
    ]);

    // Sheet 5: Customer Master
    const cmHeader = ["ID", "Name", "Phone", "Email", "Address", "GSTIN", "Created At"];
    const cmRows: unknown[][] = customers.map((c) => [
      c.id, c.name, c.phone, c.email, c.address, c.gstin, c.createdAt,
    ]);

    const xlsx = buildXlsx([
      { name: "Transactions",       rows: [txHeader, ...txRows] },
      { name: "Item Lines",         rows: [ilHeader, ...ilRows] },
      { name: "Customer Summary",   rows: [csHeader, ...csRows] },
      { name: "Stock Status",       rows: [stHeader, ...stRows] },
      { name: "Customer Master",    rows: [cmHeader, ...cmRows] },
    ]);

    const label = monthFilter || "All";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="JDSTraders_Report_${label}.xlsx"`);
    res.send(xlsx);
  });

  // ── Vite Dev / Static ─────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\x1b[32m✓ JDS Traders Billing running at http://localhost:${PORT}\x1b[0m`);
  });
}

startServer();
