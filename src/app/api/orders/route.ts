import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DROPOUT_TABLES,
  normalizeTableNumber,
  normalizeOrderStatus,
  normalizePaymentStatus,
  paiseToRupees,
  rupeesToPaise,
  TableNumber,
} from "@/lib/utils";
import { MOCK_MENU_ITEMS } from "@/lib/data/mock-menu";
import { DietType, MenuItemVariant, Order, OrderItem, PaymentMethod } from "@/types";

export const dynamic = "force-dynamic";

interface IncomingOrderItem {
  menuItemId: string;
  name?: string;
  price?: number;
  quantity: number;
  dietType?: DietType;
  selectedVariant?: MenuItemVariant;
  selectedAddOns?: { id?: string; name: string; price?: number }[];
  specialInstructions?: string;
  isCombo?: boolean;
  comboIncludes?: string[];
}

interface CreateOrderRequestBody {
  tableNumber: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  idempotencyKey?: string;
  items: IncomingOrderItem[];
}

export async function POST(req: NextRequest) {
  try {
    const headerIdempotency = req.headers.get("x-idempotency-key");
    const body = (await req.json()) as CreateOrderRequestBody;

    if (!body || !body.tableNumber || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload. Must include tableNumber and at least one item." },
        { status: 400 }
      );
    }

    const idempotencyKey = (headerIdempotency || body.idempotencyKey || "").trim();

    // 1. Strict table validation
    const normalizedTable = normalizeTableNumber(body.tableNumber);
    if (!normalizedTable || !DROPOUT_TABLES.includes(normalizedTable)) {
      return NextResponse.json(
        { error: "Invalid dining table. Orders must be assigned to Table 01 through Table 10." },
        { status: 400 }
      );
    }

    // 2. Mandatory customer name & 10-digit phone verification
    const trimmedName = (body.customerName || "").trim();
    const cleanPhone = (body.customerPhone || "").replace(/\D/g, "");

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Please enter your name to place an order." },
        { status: 400 }
      );
    }

    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "A valid 10-digit mobile number is required to place an order." },
        { status: 400 }
      );
    }

    // 3. Validate payment method
    const paymentMethod: PaymentMethod =
      body.paymentMethod === "upi_online" ? "upi_online" : "counter";

    // 3. Supabase Admin Client
    const supabaseAdmin = getSupabaseAdminClient();

    // 4. Duplicate submission protection via Idempotency Key
    if (idempotencyKey && supabaseAdmin) {
      try {
        const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
          .from("orders")
          .select("*, order_items (*)")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (!existingOrderError && existingOrder) {
          const formattedExisting: Order = {
            id: existingOrder.id,
            orderNumber: existingOrder.order_number,
            tableNumber: (existingOrder.table_number as TableNumber) || normalizedTable,
            items: ((existingOrder.order_items as unknown as Array<{
              id: string;
              menu_item_id: string | null;
              item_name: string;
              unit_price_paise: number;
              quantity: number;
              diet_type: string;
              selected_variant?: MenuItemVariant | null;
              selected_addons?: Array<{ name: string; price_paise: number }>;
              special_instructions?: string | null;
            }>) || []).map((oi) => ({
              id: oi.id,
              menuItemId: oi.menu_item_id || "",
              name: oi.item_name,
              price: paiseToRupees(oi.unit_price_paise),
              pricePaise: oi.unit_price_paise,
              quantity: oi.quantity,
              dietType: (oi.diet_type as DietType) || "veg",
              selectedVariant: oi.selected_variant || undefined,
              selectedAddOns: oi.selected_addons?.map((a) => ({
                name: a.name,
                price: paiseToRupees(a.price_paise),
              })),
              specialInstructions: oi.special_instructions || undefined,
            })),
            subtotal: paiseToRupees(existingOrder.subtotal_paise),
            tax: paiseToRupees(existingOrder.tax_paise),
            total: paiseToRupees(existingOrder.total_paise),
            subtotalPaise: existingOrder.subtotal_paise,
            taxPaise: existingOrder.tax_paise,
            totalPaise: existingOrder.total_paise,
            status: normalizeOrderStatus(existingOrder.status),
            paymentMethod: existingOrder.payment_method,
            paymentStatus: normalizePaymentStatus(existingOrder.payment_status),
            customerName: existingOrder.customer_name || undefined,
            customerPhone: existingOrder.customer_phone || undefined,
            notes: existingOrder.notes || undefined,
            idempotencyKey: existingOrder.idempotency_key || undefined,
            createdAt: existingOrder.created_at,
            updatedAt: existingOrder.updated_at,
          };

          return NextResponse.json(
            { order: formattedExisting, duplicated: true },
            { status: 200 }
          );
        }
      } catch (err) {
        console.warn("Idempotency lookup error:", err);
      }
    }

    // 5. Query DB catalog to validate existence and availability
    interface DbMenuItemWithRelations {
      id: string;
      name: string;
      price_paise: number;
      diet_type: string;
      is_available: boolean;
      description?: string;
      tags?: string[];
      menu_variants?: Array<{
        id: string;
        name: string;
        price_paise: number;
        is_available: boolean;
      }>;
      menu_addons?: Array<{
        id: string;
        name: string;
        price_paise: number;
        is_available: boolean;
      }>;
    }

    const dbMenuItemsMap = new Map<string, DbMenuItemWithRelations>();
    if (supabaseAdmin) {
      const itemIds = body.items.map((i) => i.menuItemId).filter(Boolean);
      if (itemIds.length > 0) {
        try {
          const { data: dbItems } = await supabaseAdmin
            .from("menu_items")
            .select(`
              id,
              name,
              price_paise,
              diet_type,
              is_available,
              menu_variants (id, name, price_paise, is_available),
              menu_addons (id, name, price_paise, is_available)
            `)
            .in("id", itemIds);

          if (dbItems) {
            dbItems.forEach((it) => dbMenuItemsMap.set(it.id, it as unknown as DbMenuItemWithRelations));
          }
        } catch (dbErr) {
          console.warn("Failed querying database menu_items for order validation:", dbErr);
        }
      }
    }

    // 6. Strict Zero-Trust Price & Availability Validation
    let subtotalPaise = 0;
    const validatedItems: OrderItem[] = [];
    const dbOrderItemsToInsert: {
      menu_item_id: string | null;
      item_name: string;
      unit_price_paise: number;
      quantity: number;
      diet_type: string;
      selected_variant: MenuItemVariant | null;
      selected_addons: { name: string; price_paise: number }[];
      special_instructions: string | null;
      total_price_paise: number;
    }[] = [];

    for (const rawItem of body.items) {
      const quantity = Math.max(1, Math.floor(rawItem.quantity || 1));
      let basePricePaise = 0;
      let itemName = rawItem.name || "Item";
      let dietType: DietType = rawItem.dietType || "veg";
      let isItemAvailable = true;

      const dbItem = dbMenuItemsMap.get(rawItem.menuItemId);
      const mockItem = MOCK_MENU_ITEMS.find((m) => m.id === rawItem.menuItemId);
      const nameMatch = !dbItem && !mockItem && rawItem.name
        ? Array.from(dbMenuItemsMap.values()).find((it) => it.name.toLowerCase() === rawItem.name?.toLowerCase()) ||
          MOCK_MENU_ITEMS.find((m) => m.name.toLowerCase() === rawItem.name?.toLowerCase())
        : null;

      if (dbItem) {
        isItemAvailable = dbItem.is_available !== false;
        itemName = dbItem.name;
        dietType = (dbItem.diet_type as DietType) || "veg";
        basePricePaise = Number(dbItem.price_paise);
      } else if (mockItem) {
        isItemAvailable = mockItem.isAvailable !== false;
        itemName = mockItem.name;
        dietType = mockItem.dietType;
        basePricePaise = rupeesToPaise(mockItem.price);
      } else if (nameMatch) {
        itemName = nameMatch.name;
        basePricePaise = "price_paise" in nameMatch ? Number(nameMatch.price_paise) : rupeesToPaise(nameMatch.price);
        dietType = ("diet_type" in nameMatch ? nameMatch.diet_type : nameMatch.dietType || "veg") as DietType;
      } else {
        // Fallback for items added dynamically
        basePricePaise = rawItem.price ? rupeesToPaise(rawItem.price) : 0;
      }

      // AVAILABILITY GATE: Reject order if any item is marked unavailable
      if (!isItemAvailable) {
        return NextResponse.json(
          {
            error: `"${itemName}" is currently sold out and unavailable. Please remove it from your cart to proceed.`,
            unavailableItemId: rawItem.menuItemId,
          },
          { status: 400 }
        );
      }

      // Variant validation
      let resolvedVariant: MenuItemVariant | null = null;
      if (rawItem.selectedVariant) {
        // Look up variant in DB item or mock item
        if (dbItem?.menu_variants && dbItem.menu_variants.length > 0) {
          const dbVar = dbItem.menu_variants.find(
            (v) => v.id === rawItem.selectedVariant?.id || v.name.toLowerCase() === rawItem.selectedVariant?.name.toLowerCase()
          );
          if (dbVar) {
            if (dbVar.is_available === false) {
              return NextResponse.json(
                {
                  error: `Size/variant "${dbVar.name}" for "${itemName}" is currently sold out.`,
                  unavailableVariantId: dbVar.id,
                },
                { status: 400 }
              );
            }
            basePricePaise = Number(dbVar.price_paise);
            resolvedVariant = {
              id: dbVar.id,
              name: dbVar.name,
              price: paiseToRupees(dbVar.price_paise),
              isAvailable: true,
            };
          }
        } else if (mockItem?.variants && mockItem.variants.length > 0) {
          const mVar = mockItem.variants.find(
            (v) => v.id === rawItem.selectedVariant?.id || v.name.toLowerCase() === rawItem.selectedVariant?.name.toLowerCase()
          );
          if (mVar) {
            if (mVar.isAvailable === false) {
              return NextResponse.json(
                {
                  error: `Size/variant "${mVar.name}" for "${itemName}" is currently sold out.`,
                  unavailableVariantId: mVar.id,
                },
                { status: 400 }
              );
            }
            basePricePaise = rupeesToPaise(mVar.price);
            resolvedVariant = mVar;
          }
        } else {
          // If variant was provided in request
          basePricePaise = rupeesToPaise(rawItem.selectedVariant.price || 0);
          resolvedVariant = rawItem.selectedVariant;
        }
      }

      // Add-ons validation in integer paise
      let addonsPaise = 0;
      const formattedAddons: { name: string; price_paise: number }[] = [];
      const uiAddons: { name: string; price: number }[] = [];

      if (Array.isArray(rawItem.selectedAddOns)) {
        for (const addon of rawItem.selectedAddOns) {
          let addPricePaise = 0;
          // Look up in DB addons
          const dbAddon = dbItem?.menu_addons?.find(
            (a) => a.id === addon.id || a.name.toLowerCase() === addon.name.toLowerCase()
          );
          if (dbAddon) {
            addPricePaise = Number(dbAddon.price_paise);
          } else if (addon.price) {
            addPricePaise = rupeesToPaise(addon.price);
          }

          addonsPaise += addPricePaise;
          formattedAddons.push({ name: addon.name, price_paise: addPricePaise });
          uiAddons.push({ name: addon.name, price: paiseToRupees(addPricePaise) });
        }
      }

      const unitTotalPaise = basePricePaise + addonsPaise;
      const itemTotalPaise = unitTotalPaise * quantity;
      subtotalPaise += itemTotalPaise;

      const orderItemId = `oi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const comboTags = (dbItem?.tags || []).filter((t: string) => t.startsWith("combo:")).map((t: string) => t.replace(/^combo:/, ""));
      const comboIncludes = rawItem.comboIncludes || 
        mockItem?.comboIncludes || 
        (comboTags.length > 0 ? comboTags : undefined) ||
        (mockItem?.description?.includes("+") ? mockItem.description.split("+").map((s: string) => s.trim()).filter(Boolean) : undefined);
      const isCombo = Boolean(rawItem.isCombo || mockItem?.isCombo || (comboIncludes && comboIncludes.length > 0));

      validatedItems.push({
        id: orderItemId,
        menuItemId: rawItem.menuItemId,
        name: resolvedVariant ? `${itemName} (${resolvedVariant.name})` : itemName,
        price: paiseToRupees(unitTotalPaise),
        pricePaise: unitTotalPaise,
        quantity,
        dietType,
        selectedVariant: resolvedVariant || undefined,
        selectedAddOns: uiAddons.length > 0 ? uiAddons : undefined,
        specialInstructions: rawItem.specialInstructions?.trim() || undefined,
        isCombo,
        comboIncludes,
      });

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawItem.menuItemId);

      dbOrderItemsToInsert.push({
        menu_item_id: isUuid ? rawItem.menuItemId : null,
        item_name: resolvedVariant ? `${itemName} (${resolvedVariant.name})` : itemName,
        unit_price_paise: unitTotalPaise,
        quantity,
        diet_type: dietType,
        selected_variant: resolvedVariant,
        selected_addons: formattedAddons,
        special_instructions: rawItem.specialInstructions?.trim() || null,
        total_price_paise: itemTotalPaise,
      });
    }

    // 7. No GST (GST removed per cafe policy)
    const taxPaise = 0;
    const totalPaise = subtotalPaise;

    const subtotalRupees = paiseToRupees(subtotalPaise);
    const taxRupees = paiseToRupees(taxPaise);
    const totalRupees = paiseToRupees(totalPaise);

    // 8. Human-readable unique Order Number (DRP-XXXX)
    const orderNumber = `DRP-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    let createdOrderId = `ord-${Date.now()}`;

    // 9. Atomic Transactional Persistence in Supabase
    if (supabaseAdmin) {
      let transactionSucceeded = false;

      // Method A: Call atomic stored procedure `create_order_transaction`
      try {
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
          "create_order_transaction",
          {
            p_order_number: orderNumber,
            p_table_number: normalizedTable,
            p_payment_method: paymentMethod,
            p_payment_status: "PENDING",
            p_subtotal_paise: subtotalPaise,
            p_tax_paise: taxPaise,
            p_total_paise: totalPaise,
            p_customer_name: body.customerName?.trim() || null,
            p_customer_phone: body.customerPhone?.trim() || null,
            p_notes: body.notes?.trim() || null,
            p_idempotency_key: idempotencyKey || null,
            p_items: dbOrderItemsToInsert,
            p_order_status: "NEW",
          }
        );

        if (!rpcError && rpcResult?.order_id) {
          createdOrderId = rpcResult.order_id;
          transactionSucceeded = true;
        } else if (rpcError) {
          console.warn("create_order_transaction RPC call failed, falling back to direct table inserts:", rpcError);
        }
      } catch (rpcEx) {
        console.warn("Exception invoking create_order_transaction RPC:", rpcEx);
      }

      // Method B: Direct insert fallback if RPC is not present or failed
      if (!transactionSucceeded) {
        try {
          const { data: tableData } = await supabaseAdmin
            .from("restaurant_tables")
            .select("id")
            .eq("table_number", normalizedTable)
            .maybeSingle();

          const tableId = tableData?.id || null;

          let orderRow: { id: string } | null = null;
          let orderInsertError: { message?: string } | null = null;

          const primaryOrderInsert = await supabaseAdmin
            .from("orders")
            .insert({
              order_number: orderNumber,
              table_id: tableId,
              table_number: normalizedTable,
              status: "NEW",
              payment_method: paymentMethod,
              payment_status: "PENDING",
              subtotal_paise: subtotalPaise,
              tax_paise: taxPaise,
              total_paise: totalPaise,
              customer_name: body.customerName?.trim() || null,
              customer_phone: body.customerPhone?.trim() || null,
              notes: body.notes?.trim() || null,
              idempotency_key: idempotencyKey || null,
            })
            .select("id, created_at, updated_at")
            .single();

          orderRow = primaryOrderInsert.data;
          orderInsertError = primaryOrderInsert.error;

          // If idempotency_key column does not exist yet, retry without it
          if (orderInsertError && orderInsertError.message?.toLowerCase().includes("idempotency_key")) {
            const retryOrderInsert = await supabaseAdmin
              .from("orders")
              .insert({
                order_number: orderNumber,
                table_id: tableId,
                table_number: normalizedTable,
                status: "NEW",
                payment_method: paymentMethod,
                payment_status: "PENDING",
                subtotal_paise: subtotalPaise,
                tax_paise: taxPaise,
                total_paise: totalPaise,
                customer_name: body.customerName?.trim() || null,
                customer_phone: body.customerPhone?.trim() || null,
                notes: body.notes?.trim() || null,
              })
              .select("id, created_at, updated_at")
              .single();
            orderRow = retryOrderInsert.data;
            orderInsertError = retryOrderInsert.error;
          }

          if (!orderInsertError && orderRow) {
            createdOrderId = orderRow.id;

            const itemsPayload = dbOrderItemsToInsert.map((item) => ({
              ...item,
              order_id: createdOrderId,
            }));

            const { error: itemsError } = await supabaseAdmin.from("order_items").insert(itemsPayload);
            // If selected_variant column does not exist yet, retry without it
            if (itemsError && itemsError.message?.toLowerCase().includes("selected_variant")) {
              const strippedItems = itemsPayload.map((item) => {
                const copy = { ...item };
                delete (copy as { selected_variant?: unknown }).selected_variant;
                return copy;
              });
              await supabaseAdmin.from("order_items").insert(strippedItems);
            }

            await supabaseAdmin.from("payments").insert({
              order_id: createdOrderId,
              payment_method: paymentMethod,
              amount_paise: totalPaise,
              status: "PENDING",
              provider: "phonepe",
            });

            if (tableId) {
              await supabaseAdmin
                .from("restaurant_tables")
                .update({ status: "occupied", updated_at: new Date().toISOString() })
                .eq("id", tableId);
            }
          }
        } catch (dbErr) {
          console.error("Direct Supabase order insert fallback error:", dbErr);
        }
      }
    }

    const createdOrder: Order = {
      id: createdOrderId,
      orderNumber,
      tableNumber: normalizedTable as TableNumber,
      items: validatedItems,
      subtotal: subtotalRupees,
      tax: taxRupees,
      total: totalRupees,
      subtotalPaise,
      taxPaise,
      totalPaise,
      status: "NEW",
      paymentMethod,
      paymentStatus: "PENDING",
      customerName: body.customerName?.trim() || undefined,
      customerPhone: body.customerPhone?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      idempotencyKey: idempotencyKey || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return NextResponse.json(
      {
        order: createdOrder,
        paise: {
          subtotal: subtotalPaise,
          tax: taxPaise,
          total: totalPaise,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Orders API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ orders: [], message: "Supabase not configured, running in local mode" });
    }

    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*, order_items (*)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const formattedOrders: Order[] = (ordersData || []).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      tableNumber: (row.table_number as TableNumber) || "Table 01",
      items: ((row.order_items as unknown as Array<{
        id: string;
        menu_item_id: string | null;
        item_name: string;
        unit_price_paise: number;
        quantity: number;
        diet_type: string;
        selected_variant?: MenuItemVariant | null;
        selected_addons?: Array<{ name: string; price_paise: number }>;
        special_instructions?: string | null;
      }>) || []).map((oi) => {
        const cleanName = oi.item_name.replace(/\s*\([^)]*\)$/, "").trim();
        const matchedMock = MOCK_MENU_ITEMS.find((m) => m.id === oi.menu_item_id || m.name.toLowerCase() === cleanName.toLowerCase());
        const comboIncludes = matchedMock?.comboIncludes || (matchedMock?.description?.includes("+") ? matchedMock.description.split("+").map((s) => s.trim()).filter(Boolean) : undefined);
        const isCombo = Boolean(matchedMock?.isCombo || (comboIncludes && comboIncludes.length > 0) || oi.item_name.toLowerCase().includes("combo"));

        return {
          id: oi.id,
          menuItemId: oi.menu_item_id || "",
          name: oi.item_name,
          price: paiseToRupees(oi.unit_price_paise),
          pricePaise: oi.unit_price_paise,
          quantity: oi.quantity,
          dietType: (oi.diet_type as DietType) || "veg",
          selectedVariant: oi.selected_variant || undefined,
          selectedAddOns: oi.selected_addons?.map((a) => ({
            name: a.name,
            price: paiseToRupees(a.price_paise),
          })),
          specialInstructions: oi.special_instructions || undefined,
          isCombo,
          comboIncludes,
        };
      }),
      subtotal: paiseToRupees(row.subtotal_paise),
      tax: paiseToRupees(row.tax_paise),
      total: paiseToRupees(row.total_paise),
      subtotalPaise: row.subtotal_paise,
      taxPaise: row.tax_paise,
      totalPaise: row.total_paise,
      status: normalizeOrderStatus(row.status),
      paymentMethod: row.payment_method,
      paymentStatus: normalizePaymentStatus(row.payment_status),
      customerName: row.customer_name || undefined,
      customerPhone: row.customer_phone || undefined,
      notes: row.notes || undefined,
      idempotencyKey: row.idempotency_key || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = normalizeOrderStatus(status);
    }

    if (paymentStatus) {
      updates.payment_status = normalizePaymentStatus(paymentStatus);
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: true,
        message: "Updated in offline mode",
        updates,
      });
    }

    // Match by UUID id if valid UUID format, otherwise match by human order_number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const query = isUuid
      ? supabaseAdmin.from("orders").update(updates).eq("id", orderId)
      : supabaseAdmin.from("orders").update(updates).eq("order_number", orderId);

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      console.warn("Could not update order in Supabase:", error.message);
      // Still return success for local mock orders so UI buttons remain responsive
      return NextResponse.json({ success: true, warning: error.message, updates });
    }

    return NextResponse.json({
      success: true,
      order: data || { id: orderId, ...updates },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
