import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numeric value into Indian Rupee (₹) format
 * e.g., 249 => "₹249", 1250.5 => "₹1,250.50"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/**
 * Convert integer paise to Rupees (e.g. 6900 => 69, 1250 => 12.5)
 */
export function paiseToRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

/**
 * Convert Rupees to integer paise (e.g. 69 => 6900, 12.5 => 1250)
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Tables supported by DROPOUT Cafe & Restro (10 Tables)
 */
export const DROPOUT_TABLES = [
  "Table 01",
  "Table 02",
  "Table 03",
  "Table 04",
  "Table 05",
  "Table 06",
  "Table 07",
  "Table 08",
  "Table 09",
  "Table 10",
] as const;

export type TableNumber = string;

export function normalizeTableNumber(rawTable: string | null | undefined): TableNumber | null {
  if (!rawTable) return null;
  const cleaned = rawTable.trim().toLowerCase();

  // Strictly match anchored patterns: "table 01", "table-01", "table_1", "01", "1", "10"
  const match = cleaned.match(/^(?:table\s*[-_]?\s*)?(\d{1,2})$/i);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  if (num >= 1 && num <= 99) {
    return `Table ${num.toString().padStart(2, "0")}` as TableNumber;
  }
  return null;
}

/**
 * Normalizes any order status representation to the standard canonical status:
 * NEW, ACCEPTED, PREPARING, READY, SERVED, COMPLETED, CANCELLED
 */
export function normalizeOrderStatus(rawStatus?: string | null): "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED" {
  if (!rawStatus) return "NEW";
  const s = rawStatus.trim().toUpperCase();
  if (s === "RECEIVED" || s === "NEW") return "NEW";
  if (s === "ACCEPTED") return "ACCEPTED";
  if (s === "PREPARING") return "PREPARING";
  if (s === "READY") return "READY";
  if (s === "SERVED") return "SERVED";
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "CANCELLED" || s === "CANCELED") return "CANCELLED";
  return "NEW";
}

/**
 * Normalizes any payment status representation to the standard canonical status:
 * PENDING, PAID, FAILED, REFUNDED
 */
export function normalizePaymentStatus(rawStatus?: string | null): "PENDING" | "PAID" | "FAILED" | "REFUNDED" {
  if (!rawStatus) return "PENDING";
  const s = rawStatus.trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "FAILED") return "FAILED";
  if (s === "REFUNDED") return "REFUNDED";
  return "PENDING";
}

/**
 * Checks whether a menu item is a pizza (by item name, category name, or category ID).
 */
export function isPizzaItem(name?: string, categoryName?: string, categoryId?: string): boolean {
  const n = (name || "").toLowerCase();
  const c = (categoryName || "").toLowerCase();
  const id = (categoryId || "").toLowerCase();
  return n.includes("pizza") || c.includes("pizza") || id.includes("pizza");
}

/**
 * Per-unit parcel/packing charge in rupees: ₹15 for pizzas, ₹10 for all other items.
 */
export function getItemParcelChargeRupees(name?: string, categoryName?: string, categoryId?: string): number {
  return isPizzaItem(name, categoryName, categoryId) ? 15 : 10;
}

/**
 * Per-unit parcel/packing charge in paise: 1500 paise (₹15) for pizzas, 1000 paise (₹10) for all other items.
 */
export function getItemParcelChargePaise(name?: string, categoryName?: string, categoryId?: string): number {
  return isPizzaItem(name, categoryName, categoryId) ? 1500 : 1000;
}
