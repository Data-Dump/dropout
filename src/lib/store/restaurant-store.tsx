"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import {
  AddOnOption,
  AdminRole,
  CartItem,
  Category,
  DietType,
  MenuItem,
  MenuItemVariant,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  StaffMember,
  TableState,
} from "@/types";
import { DROPOUT_TABLES, TableNumber, paiseToRupees, rupeesToPaise, normalizeOrderStatus, normalizePaymentStatus } from "@/lib/utils";
import { CAFE_DETAILS, MOCK_CATEGORIES, MOCK_MENU_ITEMS } from "@/lib/data/mock-menu";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { playNewOrderChime } from "@/lib/audio";
import { toast } from "sonner";

interface PlaceOrderParams {
  tableNumber: TableNumber;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  idempotencyKey?: string;
}

interface RestaurantContextType {
  // Table state
  selectedTable: TableNumber | null;
  setSelectedTable: (table: TableNumber | null) => void;
  tables: TableState[];
  updateTableCapacity: (tableNumber: TableNumber, capacity: number) => void;

  // Menu state
  menuItems: MenuItem[];
  categories: Category[];
  toggleItemAvailability: (itemId: string) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, "id">) => Promise<MenuItem>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  reorderMenuItems: (reorderedItems: MenuItem[]) => Promise<void>;
  moveMenuItemOrder: (id: string, direction: "up" | "down") => Promise<void>;

  // Category state
  addCategory: (category: Omit<Category, "id">) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (reorderedCategories: Category[]) => Promise<void>;
  moveCategoryOrder: (id: string, direction: "up" | "down") => Promise<void>;

  // Cart state
  cart: CartItem[];
  addToCart: (
    item: MenuItem,
    quantity?: number,
    selectedAddOns?: AddOnOption[],
    specialInstructions?: string,
    selectedVariant?: MenuItemVariant
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartTax: number;
  cartTotal: number;

  // Orders state
  orders: Order[];
  placeOrder: (params: PlaceOrderParams) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => void;
  deleteOrder: (orderId: string) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByTable: (tableNumber: TableNumber) => Order[];

  // Staff state
  staff: StaffMember[];
  currentStaff: StaffMember | null;
  setCurrentStaff: (member: StaffMember | null) => void;
  addStaff: (member: Omit<StaffMember, "id">) => void;
  updateStaff: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
  toggleStaffDuty: (id: string) => void;

  // Admin Auth & Role
  isAdminAuthenticated: boolean;
  adminRole: AdminRole;
  adminLogin: (pin: string) => boolean;
  adminLoginWithCredentials: (account: string, password: string) => Promise<{ success: boolean; role?: AdminRole; error?: string }>;
  adminLogout: () => void;

  // Reset state
  resetToDefaults: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  CART: "dropout_pos_cart",
  ORDERS: "dropout_pos_orders",
  MENU_ITEMS: "dropout_pos_menu_items",
  CATEGORIES: "dropout_pos_categories",
  TABLE_CAPACITIES: "dropout_pos_table_capacities",
  STAFF: "dropout_pos_staff",
  ADMIN_AUTH: "dropout_pos_admin_auth",
  ADMIN_ROLE: "dropout_pos_admin_role",
  SELECTED_TABLE: "dropout_pos_selected_table",
};

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "stf-1",
    name: "Rahul Verma",
    role: "Manager",
    phone: "+91 98765 43210",
    pin: "1234",
    status: "on_duty",
    joinedDate: "2024-01-15",
  },
  {
    id: "stf-2",
    name: "Chef Aniket Joshi",
    role: "Head Chef",
    phone: "+91 98220 12345",
    pin: "4321",
    status: "on_duty",
    joinedDate: "2024-02-01",
  },
  {
    id: "stf-3",
    name: "Priya Sharma",
    role: "Cashier",
    phone: "+91 97654 32109",
    pin: "1122",
    status: "on_duty",
    joinedDate: "2024-03-10",
  },
  {
    id: "stf-4",
    name: "Vikram Malhotra",
    role: "Barista",
    phone: "+91 99887 76655",
    pin: "5544",
    status: "off_duty",
    joinedDate: "2024-04-05",
  },
  {
    id: "stf-5",
    name: "Suraj Jadhav",
    role: "Server",
    phone: "+91 91234 56780",
    pin: "9900",
    status: "on_duty",
    joinedDate: "2024-05-20",
  },
];

const DEFAULT_CAPACITIES: Record<string, number> = {
  "Table 01": 2,
  "Table 02": 2,
  "Table 03": 4,
  "Table 04": 4,
  "Table 05": 4,
  "Table 06": 4,
  "Table 07": 6,
  "Table 08": 6,
  "Table 09": 4,
  "Table 10": 8,
};

// Production: orders start empty and synchronize live with Supabase
const INITIAL_EMPTY_ORDERS: Order[] = [];

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [selectedTable, setSelectedTableState] = useState<TableNumber | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_EMPTY_ORDERS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MOCK_MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [tableCapacities, setTableCapacities] = useState<Record<string, number>>(DEFAULT_CAPACITIES);
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(INITIAL_STAFF[0]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialOrderSyncRef = useRef<boolean>(true);

  // Load state from localStorage on client mount
  useEffect(() => {
    try {
      const storedTable = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_TABLE);
      if (storedTable && DROPOUT_TABLES.includes(storedTable as TableNumber)) {
        setSelectedTableState(storedTable as TableNumber);
      }

      const storedCart = localStorage.getItem(LOCAL_STORAGE_KEYS.CART);
      if (storedCart) setCart(JSON.parse(storedCart));

      const storedOrders = localStorage.getItem(LOCAL_STORAGE_KEYS.ORDERS);
      if (storedOrders) setOrders(JSON.parse(storedOrders));

      const storedMenuItems = localStorage.getItem(LOCAL_STORAGE_KEYS.MENU_ITEMS);
      if (storedMenuItems) {
        try {
          const parsed = JSON.parse(storedMenuItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter(
              (p: MenuItem) => p.id !== "item-test-1rs" && !p.name.includes("₹1")
            );
            const missingMockItems = MOCK_MENU_ITEMS.filter(
              (m) => !cleaned.some((p: MenuItem) => p.id === m.id || p.name === m.name)
            );
            setMenuItems([...missingMockItems, ...cleaned]);
          }
        } catch (e) {
          console.warn("Could not parse menu items from local storage:", e);
        }
      }

      const storedCategories = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES);
      if (storedCategories) setCategories(JSON.parse(storedCategories));

      const storedCapacities = localStorage.getItem(LOCAL_STORAGE_KEYS.TABLE_CAPACITIES);
      if (storedCapacities) setTableCapacities(JSON.parse(storedCapacities));

      const storedStaff = localStorage.getItem(LOCAL_STORAGE_KEYS.STAFF);
      if (storedStaff) setStaff(JSON.parse(storedStaff));

      const storedAuth = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_AUTH);
      if (storedAuth !== null) setIsAdminAuthenticated(storedAuth === "true");

      const storedRole = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ROLE);
      if (storedRole === "superadmin" || storedRole === "kitchen") {
        setAdminRole(storedRole);
      }
    } catch (e) {
      console.warn("Could not parse restaurant local storage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Supabase Realtime synchronization & Initial data sync
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let isMounted = true;

    const syncCategories = async () => {
      try {
        const { data: dbCategories, error } = await supabase
          .from("menu_categories")
          .select("*")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (isMounted && !error && dbCategories && dbCategories.length > 0) {
          setCategories(
            dbCategories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: c.description || undefined,
              icon: c.icon || undefined,
              displayOrder: c.display_order ?? 0,
            }))
          );
        }
      } catch (err) {
        console.warn("Categories sync skipped:", err);
      }
    };

    const syncMenuItems = async () => {
      try {
        const { data: dbItems, error } = await supabase
          .from("menu_items")
          .select(`
            *,
            category:menu_categories (id, name, slug),
            menu_variants (*),
            menu_addons (*)
          `)
          .order("created_at", { ascending: true });

        if (error) {
          console.warn("Supabase menu_items query error:", error);
          return;
        }

        if (isMounted && dbItems && dbItems.length > 0) {
          const mapped: MenuItem[] = dbItems.map((item): MenuItem => {
            const variants = Array.isArray(item.menu_variants)
              ? item.menu_variants
                  .sort((a: { display_order?: number }, b: { display_order?: number }) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((v: { id: string; name: string; price_paise: number; is_default?: boolean; is_available?: boolean }) => ({
                    id: v.id,
                    name: v.name,
                    price: paiseToRupees(v.price_paise),
                    isDefault: v.is_default,
                    isAvailable: v.is_available,
                  }))
              : [];

            const addons = Array.isArray(item.menu_addons)
              ? item.menu_addons.map((a: { id: string; name: string; price_paise: number }) => ({
                  id: a.id,
                  name: a.name,
                  price: paiseToRupees(a.price_paise),
                }))
              : [];

            const addOnGroups =
              addons.length > 0
                ? [
                    {
                      id: `grp-${item.id}`,
                      title: "Customisations & Add-ons",
                      options: addons,
                    },
                  ]
                : undefined;

            const comboTags = (item.tags || [])
              .filter((t: string) => t.startsWith("combo:"))
              .map((t: string) => t.replace(/^combo:/, ""));

            const isCombo = Boolean(
              item.tags?.includes("is_combo") ||
              comboTags.length > 0 ||
              item.name?.toLowerCase().includes("combo") ||
              (item.description && item.description.includes("+"))
            );

            const comboIncludes = comboTags.length > 0
              ? comboTags
              : isCombo && item.description && item.description.includes("+")
                ? item.description.split(/[\+,]/).map((s: string) => s.trim()).filter(Boolean)
                : undefined;

            const categoryInfo = item.category as { id?: string; name?: string; slug?: string } | null;
            const categoryName = categoryInfo?.name || "Combos & Buddy Meals";

            return {
              id: item.id,
              name: item.name,
              description: item.description || "",
              price: paiseToRupees(item.price_paise),
              oldPrice: item.old_price_paise ? paiseToRupees(item.old_price_paise) : undefined,
              discountText: item.discount_text || undefined,
              categoryId: item.category_id || "",
              categoryName,
              dietType: (item.diet_type as DietType) || "veg",
              imageUrl: item.image_url,
              isAvailable: item.is_available,
              isBestseller: item.is_bestseller,
              isChefSpecial: item.is_chef_special,
              preparationTimeMinutes: item.preparation_time_minutes || 15,
              portionSize: item.portion_size || undefined,
              tags: item.tags || [],
              displayOrder: 0,
              isCombo,
              comboIncludes,
              variants: variants.length > 0 ? variants : undefined,
              addOnGroups,
            };
          });

          // Filter out test items from production menu
          const filtered = mapped.filter(
            (m) => m.id !== "item-test-1rs" && !m.name.includes("₹1")
          );

          setMenuItems(filtered);
        }
      } catch (err) {
        console.warn("Menu items sync skipped:", err);
      }
    };

    const syncOrders = async (isBackgroundPoll = false) => {
      try {
        const ordersRes = await fetch("/api/orders");
        if (ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          if (isMounted && Array.isArray(ordersJson?.orders)) {
            const fetchedOrders: Order[] = ordersJson.orders;

            // Detect new orders that arrived after initial load
            if (!isInitialOrderSyncRef.current) {
              const isStaffRoute =
                typeof window !== "undefined" &&
                (window.location.pathname.startsWith("/kitchen") ||
                  window.location.pathname.startsWith("/admin"));

              const newlyArrived = fetchedOrders.filter(
                (o) =>
                  !knownOrderIdsRef.current.has(o.id) &&
                  (normalizeOrderStatus(o.status) === "NEW" || normalizeOrderStatus(o.status) === "ACCEPTED")
              );

              // ONLY ring chime and show incoming order toast on staff routes (/kitchen, /admin)
              // Customers on menu, table or order pages will NEVER be disturbed
              if (newlyArrived.length > 0 && isStaffRoute) {
                // Play melodic harmonic restaurant chime for kitchen/admin staff
                playNewOrderChime();

                const firstOrder = newlyArrived[0];
                const itemsSummary = firstOrder.items
                  .map((i) => `${i.quantity}x ${i.name}`)
                  .slice(0, 2)
                  .join(", ");

                toast.info(`🔔 New Order from ${firstOrder.tableNumber}! (${firstOrder.orderNumber})`, {
                  description: `${itemsSummary}${firstOrder.items.length > 2 ? " + more" : ""} • ₹${firstOrder.total}`,
                  duration: 6000,
                });
              }
            }

            // Update known orders set
            knownOrderIdsRef.current = new Set(fetchedOrders.map((o) => o.id));
            isInitialOrderSyncRef.current = false;

            setOrders(fetchedOrders);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(fetchedOrders));
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        if (!isBackgroundPoll) {
          console.warn("Orders sync skipped:", err);
        }
      }
    };

    // Initial sync
    syncCategories();
    syncMenuItems();
    syncOrders();

    // 1. High-frequency background polling every 2.5 seconds
    // Guarantees orders pop up automatically in kitchen without needing website refresh
    const pollingTimer = setInterval(() => {
      syncOrders(true);
    }, 2500);

    // 2. Immediate sync on window focus and tab visibility change
    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        syncOrders(true);
      }
    };

    window.addEventListener("focus", handleVisibilitySync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    // Set up Supabase Realtime channel across all menu & order tables
    const realtimeChannel = supabase
      .channel("dropout-pos-menu-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async () => {
          syncOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_categories" },
        async () => {
          syncCategories();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        async () => {
          syncMenuItems();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_variants" },
        async () => {
          syncMenuItems();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_addons" },
        async () => {
          syncMenuItems();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollingTimer);
      window.removeEventListener("focus", handleVisibilitySync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Sync state to localStorage when changes occur
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.warn("Failed saving cart", e);
    }
  }, [cart, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn("Failed saving orders", e);
    }
  }, [orders, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));
    } catch (e) {
      console.warn("Failed saving menu items", e);
    }
  }, [menuItems, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.warn("Failed saving categories", e);
    }
  }, [categories, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TABLE_CAPACITIES, JSON.stringify(tableCapacities));
    } catch (e) {
      console.warn("Failed saving table capacities", e);
    }
  }, [tableCapacities, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.STAFF, JSON.stringify(staff));
    } catch (e) {
      console.warn("Failed saving staff", e);
    }
  }, [staff, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_AUTH, String(isAdminAuthenticated));
    } catch (e) {
      console.warn("Failed saving admin auth", e);
    }
  }, [isAdminAuthenticated, isHydrated]);

  const setSelectedTable = (table: TableNumber | null) => {
    setSelectedTableState(table);
    if (table) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_TABLE, table);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_TABLE);
    }
  };

  // Cart operations
  const addToCart = (
    item: MenuItem,
    qtyToAdd = 1,
    selectedAddOns: AddOnOption[] = [],
    specialInstructions?: string,
    selectedVariant?: MenuItemVariant
  ) => {
    const basePrice = selectedVariant ? selectedVariant.price : item.price;
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = basePrice + addOnsTotal;

    const variantKey = selectedVariant ? selectedVariant.id : "none";
    const addOnsKey = selectedAddOns
      .map((a) => a.id)
      .sort()
      .join(",");
    const instructionsKey = (specialInstructions || "").trim().toLowerCase();

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((c) => {
        const cVariantKey = c.selectedVariant ? c.selectedVariant.id : "none";
        const cAddOnsKey = (c.selectedAddOns || [])
          .map((a) => a.id)
          .sort()
          .join(",");
        const cInstructionsKey = (c.specialInstructions || "").trim().toLowerCase();
        return (
          c.menuItem.id === item.id &&
          cVariantKey === variantKey &&
          cAddOnsKey === addOnsKey &&
          cInstructionsKey === instructionsKey
        );
      });

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += qtyToAdd;
        return updated;
      }

      return [
        ...prevCart,
        {
          id: `${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          menuItem: item,
          quantity: qtyToAdd,
          selectedVariant,
          selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
          specialInstructions: specialInstructions?.trim() || undefined,
          unitPrice,
        },
      ];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart calculations
  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const cartTax = useMemo(() => {
    return Math.round(cartSubtotal * CAFE_DETAILS.gstRate * 100) / 100;
  }, [cartSubtotal]);

  const cartTotal = useMemo(() => {
    return Math.round(cartSubtotal + cartTax);
  }, [cartSubtotal, cartTax]);

  // Order operations
  const placeOrder = async (params: PlaceOrderParams): Promise<Order> => {
    // 1. Post to validated server-side order API (which recalculates all amounts strictly in integer paise)
    try {
      const payload = {
        tableNumber: params.tableNumber,
        paymentMethod: params.paymentMethod,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        notes: params.notes,
        idempotencyKey: params.idempotencyKey,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          name: c.selectedVariant ? `${c.menuItem.name} (${c.selectedVariant.name})` : c.menuItem.name,
          price: c.unitPrice,
          quantity: c.quantity,
          dietType: c.menuItem.dietType,
          selectedVariant: c.selectedVariant,
          selectedAddOns: c.selectedAddOns?.map((a) => ({ id: a.id, name: a.name, price: a.price })),
          specialInstructions: c.specialInstructions,
          isCombo: c.menuItem.isCombo,
          comboIncludes: c.menuItem.comboIncludes,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(params.idempotencyKey ? { "x-idempotency-key": params.idempotencyKey } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.order) {
          setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
          clearCart();
          return data.order;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error) {
          throw new Error(errJson.error);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message && !err.message.includes("fetch")) {
        throw err;
      }
      console.warn("Server order placement error, falling back to local creation:", err);
    }

    // Graceful offline/local fallback (DRP-date-order, e.g. DRP-YYYYMMDD-001)
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const yyyy = istNow.getUTCFullYear();
    const mm = String(istNow.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(istNow.getUTCDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const prefix = `DRP-${dateStr}-`;

    let maxSeq = 0;
    for (const ord of orders) {
      const match = ord.orderNumber?.match(new RegExp(`^${prefix}(\\d+)`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    const orderNumber = `${prefix}${String(nextSeq).padStart(3, "0")}`;

    const orderItems = cart.map((c) => ({
      id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: c.menuItem.id,
      name: c.selectedVariant ? `${c.menuItem.name} (${c.selectedVariant.name})` : c.menuItem.name,
      price: c.unitPrice,
      quantity: c.quantity,
      dietType: c.menuItem.dietType,
      selectedVariant: c.selectedVariant,
      selectedAddOns: c.selectedAddOns?.map((a) => ({ name: a.name, price: a.price })),
      specialInstructions: c.specialInstructions,
      isCombo: c.menuItem.isCombo,
      comboIncludes: c.menuItem.comboIncludes,
    }));

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      tableNumber: params.tableNumber,
      items: orderItems,
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartTotal,
      status: "NEW",
      paymentMethod: params.paymentMethod,
      paymentStatus: "PENDING",
      customerName: params.customerName?.trim() || undefined,
      customerPhone: params.customerPhone?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const canonicalStatus = normalizeOrderStatus(status);

    // Optimistic local update
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId || ord.orderNumber === orderId
          ? { ...ord, status: canonicalStatus, updatedAt: new Date().toISOString() }
          : ord
      )
    );

    // Authoritative server-side update via API (bypasses RLS limits, triggers Supabase Realtime broadcast)
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: canonicalStatus }),
      });
    } catch (err) {
      console.warn("API order status update warning:", err);
    }

    // Direct Supabase client sync fallback
    const supabase = getSupabaseBrowserClient();
    if (supabase && orderId.length === 36) {
      try {
        await supabase.from("orders").update({ status: canonicalStatus }).eq("id", orderId);
      } catch (e) {
        console.warn("Failed direct status update to Supabase:", e);
      }
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    const canonicalPaymentStatus = normalizePaymentStatus(paymentStatus);

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId || ord.orderNumber === orderId
          ? { ...ord, paymentStatus: canonicalPaymentStatus, updatedAt: new Date().toISOString() }
          : ord
      )
    );

    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentStatus: canonicalPaymentStatus }),
      });
    } catch (err) {
      console.warn("API payment status update warning:", err);
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase && orderId.length === 36) {
      try {
        await supabase.from("orders").update({ payment_status: canonicalPaymentStatus }).eq("id", orderId);
      } catch (e) {
        console.warn("Failed direct payment update to Supabase:", e);
      }
    }
  };

  const deleteOrder = async (orderId: string): Promise<void> => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId && o.orderNumber !== orderId));
    try {
      await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Failed deleting order:", e);
    }
  };

  const clearAllOrders = async (): Promise<void> => {
    knownOrderIdsRef.current = new Set();
    isInitialOrderSyncRef.current = false;
    setOrders([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ORDERS);
      await fetch("/api/orders?all=true", { method: "DELETE" });
    } catch (e) {
      console.warn("Failed clearing all orders:", e);
    }
  };

  // Menu item CRUD
  const toggleItemAvailability = async (itemId: string) => {
    const item = menuItems.find((i) => i.id === itemId);
    const updatedVal = item ? !item.isAvailable : false;

    setMenuItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, isAvailable: updatedVal } : i
      )
    );

    const supabase = getSupabaseBrowserClient();
    if (supabase && itemId.length === 36) {
      try {
        await supabase.from("menu_items").update({ is_available: updatedVal }).eq("id", itemId);
      } catch (e) {
        console.warn("Failed syncing item availability to Supabase:", e);
      }
    }
  };

  const addMenuItem = async (item: Omit<MenuItem, "id">): Promise<MenuItem> => {
    const localId = `item-${Date.now()}`;
    const newItem: MenuItem = {
      ...item,
      id: localId,
      displayOrder: item.displayOrder ?? menuItems.length + 1,
    };
    setMenuItems((prev) => [newItem, ...prev]);

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        const comboTags = (item.comboIncludes || []).map((c) => `combo:${c}`);
        const baseTags = (item.tags || []).filter((t) => !t.startsWith("combo:") && t !== "is_combo");
        const finalTags = item.isCombo || comboTags.length > 0
          ? [...baseTags, "is_combo", ...comboTags]
          : baseTags;

        const { data, error } = await supabase
          .from("menu_items")
          .insert({
            name: item.name,
            description: item.description,
            price_paise: rupeesToPaise(item.price),
            old_price_paise: item.oldPrice ? rupeesToPaise(item.oldPrice) : null,
            discount_text: item.discountText || null,
            category_id: item.categoryId && item.categoryId.length === 36 ? item.categoryId : null,
            diet_type: item.dietType,
            image_url: item.imageUrl,
            portion_size: item.portionSize || null,
            is_available: item.isAvailable,
            is_bestseller: item.isBestseller || false,
            is_chef_special: item.isChefSpecial || false,
            preparation_time_minutes: item.preparationTimeMinutes || 15,
            tags: finalTags,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const itemId = data.id;

          // Insert variants if present
          if (item.variants && item.variants.length > 0) {
            await supabase.from("menu_variants").insert(
              item.variants.map((v, idx) => ({
                menu_item_id: itemId,
                name: v.name,
                price_paise: rupeesToPaise(v.price),
                is_default: v.isDefault || idx === 0,
                is_available: v.isAvailable ?? true,
                display_order: idx,
              }))
            );
          }

          // Insert add-ons if present
          const addOns = item.addOnGroups?.flatMap((g) => g.options) || [];
          if (addOns.length > 0) {
            await supabase.from("menu_addons").insert(
              addOns.map((opt) => ({
                menu_item_id: itemId,
                name: opt.name,
                price_paise: rupeesToPaise(opt.price),
                is_available: true,
              }))
            );
          }

          const createdItem: MenuItem = {
            ...newItem,
            id: itemId,
          };

          setMenuItems((prev) =>
            prev.map((m) => (m.id === localId ? createdItem : m))
          );
          return createdItem;
        }
      } catch (e) {
        console.warn("Failed adding menu item to Supabase:", e);
      }
    }
    return newItem;
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>): Promise<void> => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    const supabase = getSupabaseBrowserClient();
    if (supabase && id.length === 36) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.price !== undefined) payload.price_paise = rupeesToPaise(updates.price);
        if (updates.oldPrice !== undefined) payload.old_price_paise = updates.oldPrice ? rupeesToPaise(updates.oldPrice) : null;
        if (updates.discountText !== undefined) payload.discount_text = updates.discountText || null;
        if (updates.dietType !== undefined) payload.diet_type = updates.dietType;
        if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
        if (updates.portionSize !== undefined) payload.portion_size = updates.portionSize || null;
        if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;
        if (updates.isBestseller !== undefined) payload.is_bestseller = updates.isBestseller;
        if (updates.isChefSpecial !== undefined) payload.is_chef_special = updates.isChefSpecial;
        if (updates.preparationTimeMinutes !== undefined) payload.preparation_time_minutes = updates.preparationTimeMinutes;
        if (updates.tags !== undefined || updates.comboIncludes !== undefined || updates.isCombo !== undefined) {
          const comboTags = (updates.comboIncludes || []).map((c) => `combo:${c}`);
          const currentTags = updates.tags || [];
          const baseTags = currentTags.filter((t) => !t.startsWith("combo:") && t !== "is_combo");
          payload.tags = updates.isCombo || comboTags.length > 0
            ? [...baseTags, "is_combo", ...comboTags]
            : baseTags;
        }
        if (updates.categoryId !== undefined && updates.categoryId.length === 36) payload.category_id = updates.categoryId;

        await supabase.from("menu_items").update(payload).eq("id", id);

        // Sync variants
        if (updates.variants !== undefined) {
          await supabase.from("menu_variants").delete().eq("menu_item_id", id);
          if (updates.variants.length > 0) {
            await supabase.from("menu_variants").insert(
              updates.variants.map((v, idx) => ({
                menu_item_id: id,
                name: v.name,
                price_paise: rupeesToPaise(v.price),
                is_default: v.isDefault || idx === 0,
                is_available: v.isAvailable ?? true,
                display_order: idx,
              }))
            );
          }
        }

        // Sync add-ons
        if (updates.addOnGroups !== undefined) {
          await supabase.from("menu_addons").delete().eq("menu_item_id", id);
          const addOns = updates.addOnGroups.flatMap((g) => g.options);
          if (addOns.length > 0) {
            await supabase.from("menu_addons").insert(
              addOns.map((opt) => ({
                menu_item_id: id,
                name: opt.name,
                price_paise: rupeesToPaise(opt.price),
                is_available: true,
              }))
            );
          }
        }
      } catch (e) {
        console.warn("Failed updating menu item in Supabase:", e);
      }
    }
  };

  const deleteMenuItem = async (id: string): Promise<void> => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));

    const supabase = getSupabaseBrowserClient();
    if (supabase && id.length === 36) {
      try {
        await supabase.from("menu_items").delete().eq("id", id);
      } catch (e) {
        console.warn("Failed deleting menu item from Supabase:", e);
      }
    }
  };

  const reorderMenuItems = async (reorderedItems: MenuItem[]): Promise<void> => {
    const updated = reorderedItems.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
    }));
    setMenuItems(updated);

    // Display order maintained locally; Supabase menu_items table sorts by created_at
  };

  const moveMenuItemOrder = async (id: string, direction: "up" | "down"): Promise<void> => {
    const currentItem = menuItems.find((m) => m.id === id);
    if (!currentItem) return;

    // Filter items in the same category
    const catItems = menuItems.filter((m) => m.categoryId === currentItem.categoryId);
    const catIndex = catItems.findIndex((m) => m.id === id);
    if (catIndex === -1) return;
    if (direction === "up" && catIndex === 0) return;
    if (direction === "down" && catIndex === catItems.length - 1) return;

    const targetIndex = direction === "up" ? catIndex - 1 : catIndex + 1;
    const reorderedCatItems = [...catItems];
    const [moved] = reorderedCatItems.splice(catIndex, 1);
    reorderedCatItems.splice(targetIndex, 0, moved);

    // Merge back
    const otherItems = menuItems.filter((m) => m.categoryId !== currentItem.categoryId);
    const newFullItems = [...reorderedCatItems, ...otherItems];

    await reorderMenuItems(newFullItems);
  };

  // Category CRUD
  const addCategory = async (category: Omit<Category, "id">): Promise<Category> => {
    const localId = `cat-${Date.now()}`;
    const newCategory: Category = {
      ...category,
      id: localId,
      displayOrder: category.displayOrder ?? categories.length + 1,
    };
    setCategories((prev) => [...prev, newCategory]);

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("menu_categories")
          .insert({
            name: category.name,
            slug: category.slug,
            description: category.description || null,
            display_order: category.displayOrder ?? categories.length + 1,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const created: Category = {
            id: data.id,
            name: data.name,
            slug: data.slug,
            description: data.description || undefined,
            icon: data.icon || undefined,
            displayOrder: data.display_order ?? 0,
          };
          setCategories((prev) =>
            prev.map((c) => (c.id === localId ? created : c))
          );
          return created;
        }
      } catch (e) {
        console.warn("Failed adding category to Supabase:", e);
      }
    }
    return newCategory;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );

    const supabase = getSupabaseBrowserClient();
    if (supabase && id.length === 36) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.slug !== undefined) payload.slug = updates.slug;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;

        await supabase.from("menu_categories").update(payload).eq("id", id);
      } catch (e) {
        console.warn("Failed updating category in Supabase:", e);
      }
    }
  };

  const deleteCategory = async (id: string): Promise<void> => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));

    const supabase = getSupabaseBrowserClient();
    if (supabase && id.length === 36) {
      try {
        await supabase.from("menu_categories").delete().eq("id", id);
      } catch (e) {
        console.warn("Failed deleting category from Supabase:", e);
      }
    }
  };

  const reorderCategories = async (reorderedCategories: Category[]): Promise<void> => {
    const updated = reorderedCategories.map((cat, idx) => ({
      ...cat,
      displayOrder: idx + 1,
    }));
    setCategories(updated);

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        for (const cat of updated) {
          if (cat.id.length === 36) {
            await supabase
              .from("menu_categories")
              .update({ display_order: cat.displayOrder })
              .eq("id", cat.id);
          }
        }
      } catch (e) {
        console.warn("Failed updating categories order in Supabase:", e);
      }
    }
  };

  const moveCategoryOrder = async (id: string, direction: "up" | "down"): Promise<void> => {
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === categories.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    await reorderCategories(reordered);
  };

  // Table management
  const updateTableCapacity = (tableNumber: TableNumber, capacity: number) => {
    setTableCapacities((prev) => ({
      ...prev,
      [tableNumber]: capacity,
    }));
  };

  // Staff CRUD
  const addStaff = (member: Omit<StaffMember, "id">) => {
    const newMember: StaffMember = {
      ...member,
      id: `stf-${Date.now()}`,
    };
    setStaff((prev) => [...prev, newMember]);
  };

  const updateStaff = (id: string, updates: Partial<StaffMember>) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleStaffDuty = (id: string) => {
    setStaff((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "on_duty" ? "off_duty" : "on_duty" }
          : s
      )
    );
  };

  // Admin Auth with Supabase Credentials (account & password)
  const adminLoginWithCredentials = async (account: string, password: string) => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const resolvedRole = (data?.role as AdminRole) || "superadmin";
        setIsAdminAuthenticated(true);
        setAdminRole(resolvedRole);

        // Assign staff session representation
        if (resolvedRole === "kitchen") {
          const chef = staff.find((s) => s.role === "Head Chef") || {
            id: "stf-kitchen",
            name: "Kitchen Display Station",
            role: "Head Chef" as const,
            phone: "+91 83878 98080",
            pin: "8082",
            status: "on_duty" as const,
            joinedDate: "2024-01-01",
          };
          setCurrentStaff(chef);
        } else {
          const manager = staff.find((s) => s.role === "Manager") || staff[0];
          setCurrentStaff(manager);
        }

        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_AUTH, "true");
          localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ROLE, resolvedRole);
        } catch {
          // ignore
        }
        return { success: true, role: resolvedRole };
      }
      return { success: false, error: data?.error || "Invalid username or password." };
    } catch (err) {
      console.error("adminLoginWithCredentials error:", err);
      return { success: false, error: "Network error during authentication." };
    }
  };

  // Quick PIN clearance (for reports elevation)
  const adminLogin = (pin: string) => {
    const masterPin = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";
    if (pin === masterPin) {
      setIsAdminAuthenticated(true);
      const manager = staff.find((s) => s.role === "Manager") || staff[0];
      setCurrentStaff(manager);
      return true;
    }
    const matchingStaff = staff.find((s) => s.pin === pin);
    if (matchingStaff) {
      setIsAdminAuthenticated(true);
      setCurrentStaff(matchingStaff);
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminRole(null);
    setCurrentStaff(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_AUTH);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ROLE);
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        supabase.auth.signOut().catch(() => null);
      }
    } catch {
      // ignore
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  };

  const getOrdersByTable = (tableNumber: TableNumber) => {
    return orders.filter((o) => o.tableNumber === tableNumber);
  };

  // Build reactive status for all 10 tables
  const tables: TableState[] = useMemo(() => {
    return DROPOUT_TABLES.map((tableNum) => {
      const tableNumSlug = tableNum.toLowerCase().replace(/\s+/g, "-");
      const activeOrder = orders.find(
        (o) =>
          o.tableNumber === tableNum &&
          normalizeOrderStatus(o.status) !== "COMPLETED" &&
          normalizeOrderStatus(o.status) !== "CANCELLED"
      );

      let status: "available" | "occupied" | "needs_attention" = "available";
      if (activeOrder) {
        status = normalizeOrderStatus(activeOrder.status) === "READY" ? "needs_attention" : "occupied";
      }

      return {
        tableNumber: tableNum,
        qrCodeUrl: `/table/${tableNumSlug.replace("table-", "")}`,
        status,
        capacity: tableCapacities[tableNum] || 4,
        activeOrderId: activeOrder?.id,
        activeOrderTotal: activeOrder?.total,
        activeOrderItemsCount: activeOrder?.items.reduce((s, i) => s + i.quantity, 0),
        occupiedSince: activeOrder?.createdAt,
      };
    });
  }, [orders, tableCapacities]);

  const resetToDefaults = () => {
    localStorage.clear();
    setOrders(INITIAL_EMPTY_ORDERS);
    setMenuItems(MOCK_MENU_ITEMS);
    setCategories(MOCK_CATEGORIES);
    setTableCapacities(DEFAULT_CAPACITIES);
    setStaff(INITIAL_STAFF);
    setCart([]);
    setSelectedTableState(null);
    setIsAdminAuthenticated(false);
    setAdminRole(null);
  };

  return (
    <RestaurantContext.Provider
      value={{
        selectedTable,
        setSelectedTable,
        tables,
        updateTableCapacity,
        menuItems,
        categories,
        toggleItemAvailability,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        reorderMenuItems,
        moveMenuItemOrder,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        moveCategoryOrder,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        cartTax,
        cartTotal,
        orders,
        placeOrder,
        updateOrderStatus,
        updatePaymentStatus,
        deleteOrder,
        clearAllOrders,
        getOrderById,
        getOrdersByTable,
        staff,
        currentStaff,
        setCurrentStaff,
        addStaff,
        updateStaff,
        deleteStaff,
        toggleStaffDuty,
        isAdminAuthenticated,
        adminRole,
        adminLogin,
        adminLoginWithCredentials,
        adminLogout,
        resetToDefaults,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }
  return context;
}
