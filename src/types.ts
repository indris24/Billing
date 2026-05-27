export interface Item {
  id: string;
  name: string;
  salePrice: number;
  purchasePrice: number;
  isbn: string;
  stock: number;
  gstRate: number;
  category: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  createdAt: string;
}

export interface InvoiceItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  gstRate: number;
  discount: number;
}

export type PaymentStatus = "Paid" | "Unpaid" | "Partial";
export type TaxType = "inclusive" | "exclusive";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: InvoiceItem[];
  taxType: TaxType;
  additionalCharges: number;
  discountAmount: number;
  roundOff: number;
  totalAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  notes: string;
}

export interface StockMovement {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  reason: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

export interface CompanySettings {
  companyName: string;
  tagline?: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  currency: string;
  invoicePrefix: string;
  terms: string;
}

export type AppView =
  | "dashboard"
  | "invoices"
  | "add-invoice"
  | "items"
  | "customers"
  | "reports"
  | "settings";
