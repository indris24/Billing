import { Invoice, InvoiceItem, CompanySettings } from "./types";

export function formatCurrency(amount: number, currency: string = "₹"): string {
  return `${currency} ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface CalculatedTotals {
  subtotal: number; // sum of bases
  taxTotal: number; // sum of taxes
  discountTotal: number; // sum of itemized discounts
  grandTotal: number; // grand total before overall discount and roundoff
  roundedFinal: number; // final rounded total
  autoRoundOff: number; // calculated round-off difference
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxType: "inclusive" | "exclusive",
  additionalCharges: number,
  overallDiscount: number
): CalculatedTotals {
  let subtotal = 0;
  let taxTotal = 0;
  let itemDiscountTotal = 0;
  let grandTotal = 0;

  items.forEach((item) => {
    const rawPrice = item.price;
    const qty = item.quantity;
    const discPct = item.discount || 0;
    const gstPct = item.gstRate || 0;

    // Apply itemized discount
    const priceAfterItemDisc = rawPrice * (1 - discPct / 100);
    const rawTotalQty = rawPrice * qty;
    const afterDiscQty = priceAfterItemDisc * qty;
    itemDiscountTotal += rawTotalQty - afterDiscQty;

    if (taxType === "inclusive") {
      // Inclusive Tax Calculation
      // Selling price is already tax-inclusive. Total = priceAfterItemDisc * qty.
      const totalTaxInclusive = afterDiscQty;
      const baseValue = totalTaxInclusive / (1 + gstPct / 100);
      const taxAmount = totalTaxInclusive - baseValue;

      subtotal += baseValue;
      taxTotal += taxAmount;
      grandTotal += totalTaxInclusive;
    } else {
      // Exclusive Tax Calculation
      // Subtotal is price * qty after discount. Tax is added on top.
      const baseValue = afterDiscQty;
      const taxAmount = baseValue * (gstPct / 100);

      subtotal += baseValue;
      taxTotal += taxAmount;
      grandTotal += baseValue + taxAmount;
    }
  });

  // Combine overall factors
  grandTotal = grandTotal + additionalCharges - overallDiscount;
  if (grandTotal < 0) grandTotal = 0;

  const roundedFinal = Math.round(grandTotal);
  const autoRoundOff = parseFloat((roundedFinal - grandTotal).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxTotal: parseFloat(taxTotal.toFixed(2)),
    discountTotal: parseFloat((itemDiscountTotal + overallDiscount).toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    roundedFinal,
    autoRoundOff,
  };
}

// WhatsApp sharing text formatter
export function generateWhatsAppLink(
  invoice: Invoice,
  settings: CompanySettings
): string {
  const currency = settings.currency || "₹";
  const formattedTotal = formatCurrency(invoice.totalAmount, currency);
  let text = `*Invoice from ${settings.companyName}*\n`;
  text += `----------------------------------\n`;
  text += `*Invoice No:* ${invoice.invoiceNumber}\n`;
  text += `*Date:* ${invoice.date}\n`;
  text += `*Customer:* ${invoice.customerName}\n`;
  if (invoice.customerPhone) text += `*Phone:* ${invoice.customerPhone}\n`;
  text += `----------------------------------\n`;
  
  invoice.items.forEach((item, idx) => {
    const lineTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
    text += `${idx + 1}. ${item.name} x ${item.quantity} = ${formatCurrency(lineTotal, currency)}\n`;
  });
  
  text += `----------------------------------\n`;
  if (invoice.additionalCharges > 0) {
    text += `*Delivery/Charges:* ${formatCurrency(invoice.additionalCharges, currency)}\n`;
  }
  if (invoice.discountAmount > 0) {
    text += `*Overall Discount:* ${formatCurrency(invoice.discountAmount, currency)}\n`;
  }
  text += `*Grand Total:* ${formattedTotal}\n`;
  
  if (invoice.paymentStatus === "Paid") {
    text += `*Payment Status:* ✅ Full Paid\n`;
  } else if (invoice.paymentStatus === "Partial") {
    text += `*Payment Status:* ⚠️ Partial Paid (Balance: ${formatCurrency(invoice.balanceDue, currency)})\n`;
  } else {
    text += `*Payment Status:* ❌ Unpaid (Balance: ${formatCurrency(invoice.balanceDue, currency)})\n`;
  }
  
  if (invoice.dueDate) {
    text += `*Due Date:* ${invoice.dueDate}\n`;
  }
  
  text += `\nThank you for doing business with us!\n`;
  
  const cleanPhone = (invoice.customerPhone || "").replace(/[^0-9]/g, "");
  // Standard phone check
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}
