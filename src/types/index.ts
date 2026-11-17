import { TableNumber } from "@/lib/utils";

export type DietType = "veg" | "non-veg" | "egg";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder: number;
}

export interface AddOnOption {
  id: string;
  name: string;
  price: number; // in INR
}

export interface AddOnGroup {
  id: string;
  title: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: AddOnOption[];
}

export interface MenuItemVariant {
  id: string;
  name: string; // e.g. "Small (250ml)", "Large (400ml)", "Half", "Full"
  price: number; // in INR
  isDefault?: boolean;
  isAvailable?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  discountText?: string;
  categoryId: string;
  categoryName?: string;
  dietType: DietType;
  imageUrl: string;
  isAvailable: boolean;
  isBestseller?: boolean;
  isChefSpecial?: boolean;
  preparationTimeMinutes?: number;
  portionSize?: string;
  tags?: string[];
  displayOrder?: number;
  isCombo?: boolean;
  comboIncludes?: string[];
  variants?: MenuItemVariant[];
  addOnGroups?: AddOnGroup[];
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: MenuItemVariant;
  selectedAddOns?: AddOnOption[];
  specialInstructions?: string;
  unitPrice: number; // base price (or variant price) + selected addons price
}

export type OrderStatus =
  | "NEW"         // New order submitted by customer
  | "ACCEPTED"    // Acknowledged by staff/kitchen
  | "PREPARING"   // Kitchen is cooking
  | "READY"       // Food plated, ready for pickup
  | "SERVED"      // Delivered to table
  | "COMPLETED"   // Billed & finished
  | "CANCELLED";  // Order cancelled

export type PaymentMethod = "counter" | "upi_online";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number; // unit price snapshot
  pricePaise?: number; // integer paise snapshot
  quantity: number;
  dietType: DietType;
  selectedVariant?: MenuItemVariant;
  selectedAddOns?: { name: string; price: number }[];
  specialInstructions?: string;
  isCombo?: boolean;
  comboIncludes?: string[];
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "DRP-1042"
  tableNumber: TableNumber;
  items: OrderItem[];
  subtotal: number;
  tax: number; // 5% GST
  total: number;
  subtotalPaise?: number;
  taxPaise?: number;
  totalPaise?: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableState {
  tableNumber: TableNumber;
  qrCodeUrl: string;
  status: "available" | "occupied" | "needs_attention";
  capacity: number;
  activeOrderId?: string;
  activeOrderTotal?: number;
  activeOrderItemsCount?: number;
  occupiedSince?: string;
}

export type StaffRole = "Manager" | "Head Chef" | "Cashier" | "Barista" | "Server";

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  pin: string;
  status: "on_duty" | "off_duty";
  joinedDate: string;
}
