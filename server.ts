import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const __dirname = process.cwd();

const DATA_DIR = path.join(__dirname, "data");

const FILES = {
  settings: path.join(DATA_DIR, "settings.json"),
  items: path.join(DATA_DIR, "items.json"),
  customers: path.join(DATA_DIR, "customers.json"),
  invoices: path.join(DATA_DIR, "invoices.json"),
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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
    terms:
      "1. Goods once sold will not be taken back.\n2. Please verify items before leaving the counter.",
  };
}

function seedDefaults() {
  ensureDataDir();

  if (!fs.existsSync(FILES.settings)) {
    writeFile(FILES.settings, defaultSettings());
  }

  if (!fs.existsSync(FILES.items)) {
    writeFile(FILES.items, []);
  }

  if (!fs.existsSync(FILES.customers)) {
    writeFile(FILES.customers, []);
  }

  if (!fs.existsSync(FILES.invoices)) {
    writeFile(FILES.invoices, []);
  }
}

async function startServer() {
  seedDefaults();

  const app = express();

  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API routes here...

  // Development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(__dirname, "dist");

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
}

startServer();