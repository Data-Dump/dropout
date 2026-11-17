"use client";

import React, { useState, useEffect } from "react";
import { Order, OrderStatus } from "@/types";
import { formatCurrency, normalizeOrderStatus } from "@/lib/utils";
import { DietBadge } from "@/components/ui/diet-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { MOCK_MENU_ITEMS } from "@/lib/data/mock-menu";
import {
  Clock,
  ChefHat,
  CheckCircle,
  Bell,
  ArrowRight,
  AlertTriangle,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from "lucide-react";

interface OrderTicketCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  isDarkTheme?: boolean;
}

export function OrderTicketCard({ order, onUpdateStatus, isDarkTheme = false }: OrderTicketCardProps) {
  const { menuItems } = useRestaurant();
  const status = normalizeOrderStatus(order.status);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());

  // Update elapsed timer periodically
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const createdTime = new Date(order.createdAt).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now - createdTime) / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  const isDelayed = elapsedMinutes >= 20 && status !== "READY" && status !== "SERVED" && status !== "COMPLETED";
  const isUrgent = elapsedMinutes >= 15 && !isDelayed;

  const toggleItemChecked = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const allItemsChecked = order.items.length > 0 && order.items.every((it) => checkedItemIds.has(it.id));

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4 sm:p-5 shadow-sm ${
        isDarkTheme
          ? "bg-[#181513] text-stone-100 border-stone-800"
          : "bg-card text-card-foreground border-border/80"
      } ${
        status === "READY"
          ? isDarkTheme
            ? "border-emerald-500/80 ring-2 ring-emerald-500/30 bg-emerald-950/20"
            : "border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-50/30"
          : isDelayed
          ? "border-rose-500 ring-2 ring-rose-500/30 animate-pulse"
          : isUrgent
          ? "border-amber-400 ring-1 ring-amber-400/30"
          : ""
      }`}
    >
      <div>
        {/* Ticket Header: Table Number & Age Timer */}
        <div className={`flex items-start justify-between gap-2 border-b pb-3 ${isDarkTheme ? "border-stone-800" : "border-border/60"}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkTheme ? "text-white" : "text-foreground"}`}>
                {order.tableNumber}
              </span>
              <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                isDarkTheme ? "bg-stone-800 text-stone-200" : "bg-stone-200/70 text-stone-800"
              }`}>
                {order.orderNumber}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold mt-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={
                  isDelayed
                    ? "text-rose-600 dark:text-rose-400 font-black animate-pulse"
                    : isUrgent
                    ? "text-amber-600 dark:text-amber-400 font-bold"
                    : isDarkTheme
                    ? "text-stone-400"
                    : "text-muted-foreground"
                }
              >
                {elapsedMinutes === 0 ? "Just now" : `${elapsedMinutes}m ago`}
              </span>
              {isDelayed && (
                <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-black ml-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  DELAYED (&gt;20m)
                </span>
              )}
            </div>
          </div>

          <div>
            {status === "NEW" && (
              <Badge variant="amber" className="animate-pulse font-black px-2.5 py-1 text-xs uppercase tracking-wider bg-amber-500 text-stone-950">
                New Order
              </Badge>
            )}
            {status === "ACCEPTED" && (
              <Badge className="bg-sky-600 text-white font-bold px-2.5 py-1 text-xs">
                Accepted
              </Badge>
            )}
            {status === "PREPARING" && (
              <Badge className="bg-amber-600 text-white font-bold px-2.5 py-1 text-xs flex items-center gap-1">
                <ChefHat className="h-3 w-3 animate-spin" />
                <span>Cooking</span>
              </Badge>
            )}
            {status === "READY" && (
              <Badge className="bg-emerald-600 text-white font-black px-2.5 py-1 text-xs flex items-center gap-1 shadow-sm">
                <Sparkles className="h-3 w-3" />
                <span>Ready to Serve</span>
              </Badge>
            )}
            {status === "SERVED" && (
              <Badge variant="stone" className="text-xs">Delivered</Badge>
            )}
            {status === "COMPLETED" && (
              <Badge variant="stone" className="text-xs">Completed</Badge>
            )}
            {status === "CANCELLED" && (
              <Badge variant="destructive" className="text-xs">Cancelled</Badge>
            )}
          </div>
        </div>

        {/* Customer & Dining Notes */}
        {(order.customerName || order.notes) && (
          <div className={`my-2.5 rounded-xl p-2.5 text-xs space-y-0.5 ${
            isDarkTheme ? "bg-stone-900 border border-stone-800" : "bg-stone-100/70 border border-stone-200/50"
          }`}>
            {order.customerName && (
              <p className={`font-bold ${isDarkTheme ? "text-stone-200" : "text-stone-800"}`}>
                Guest: {order.customerName} {order.customerPhone && `• ${order.customerPhone}`}
              </p>
            )}
            {order.notes && (
              <p className="text-primary font-semibold italic">Note: {order.notes}</p>
            )}
          </div>
        )}

        {/* Ordered Food Items Checklist */}
        <div className={`my-3 space-y-2.5 divide-y ${isDarkTheme ? "divide-stone-800/80" : "divide-border/50"}`}>
          {order.items.map((item) => {
            const isChecked = checkedItemIds.has(item.id);
            const cleanName = item.name.replace(/\s*\([^)]*\)$/, "").trim().toLowerCase();
            const matched = menuItems.find((m) => m.id === item.menuItemId || m.name.toLowerCase() === cleanName);
            const mockMatched = MOCK_MENU_ITEMS.find((m) => m.name.toLowerCase() === cleanName || m.id === item.menuItemId);
            const comboContents = item.comboIncludes || 
              matched?.comboIncludes || 
              (matched?.description?.includes("+") ? matched.description.split("+").map((s) => s.trim()).filter(Boolean) : undefined) ||
              mockMatched?.comboIncludes || 
              (mockMatched?.description?.includes("+") ? mockMatched.description.split("+").map((s) => s.trim()).filter(Boolean) : undefined);

            return (
              <div
                key={item.id}
                onClick={() => toggleItemChecked(item.id)}
                className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 cursor-pointer group rounded-lg p-1 transition-colors ${
                  isChecked
                    ? isDarkTheme ? "opacity-50" : "opacity-60 bg-muted/40"
                    : isDarkTheme ? "hover:bg-stone-900/60" : "hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {/* Tap checkbox to mark dish ready */}
                  <button
                    type="button"
                    className="mt-0.5 text-muted-foreground group-hover:text-foreground shrink-0 focus:outline-none"
                    aria-label={isChecked ? "Mark unready" : "Mark dish prepared"}
                  >
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </button>

                  {/* Quantity Badge */}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-black text-xs ${
                      isDarkTheme
                        ? "bg-stone-800 text-stone-100 border border-stone-700"
                        : "bg-secondary text-foreground font-black"
                    }`}
                  >
                    {item.quantity}x
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DietBadge type={item.dietType} size="sm" />
                      <span className={`font-bold text-sm tracking-tight ${isChecked ? "line-through text-muted-foreground" : isDarkTheme ? "text-stone-100" : "text-foreground"}`}>
                        {item.name}
                      </span>
                      {comboContents && comboContents.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>Combo</span>
                        </span>
                      )}
                    </div>

                    {/* Combo Breakdown in Kitchen */}
                    {comboContents && comboContents.length > 0 && (
                      <div className={`mt-1.5 p-2 rounded-lg text-[11px] space-y-1 ${
                        isDarkTheme
                          ? "bg-amber-950/40 border border-amber-800/50 text-amber-200"
                          : "bg-amber-50 border border-amber-200 text-amber-900"
                      }`}>
                        <div className="flex items-center gap-1 font-black text-[10px] uppercase tracking-wider">
                          <Layers className="h-3 w-3 text-amber-500" />
                          <span>Contains ({comboContents.length} items to prepare):</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {comboContents.map((cName, cIdx) => (
                            <span
                              key={cIdx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] ${
                                isDarkTheme
                                  ? "bg-stone-900 border border-stone-800 text-stone-200"
                                  : "bg-white border border-amber-200 text-amber-950 shadow-2xs"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>{cName}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portion variant */}
                    {item.selectedVariant && (
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[11px] font-semibold mt-0.5 ${
                        isDarkTheme ? "bg-stone-800 text-stone-300" : "bg-stone-200/80 text-stone-800"
                      }`}>
                        Portion: {item.selectedVariant.name}
                      </span>
                    )}

                    {/* Custom Add-ons */}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                        + {item.selectedAddOns.map((a) => a.name).join(", ")}
                      </div>
                    )}

                    {/* Special Kitchen Instructions */}
                    {item.specialInstructions && (
                      <div className="mt-1 rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>⚠️ {item.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket Footer Action Buttons */}
      <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${isDarkTheme ? "border-stone-800" : "border-border/60"}`}>
        <div className="text-xs text-muted-foreground">
          <span>{order.items.length} items • </span>
          <span className={`font-bold ${isDarkTheme ? "text-stone-200" : "text-foreground"}`}>
            {formatCurrency(order.total)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {status === "NEW" && (
            <>
              <Button
                size="sm"
                onClick={() => onUpdateStatus(order.id, "ACCEPTED")}
                variant="outline"
                className={`gap-1 rounded-xl text-xs font-bold ${isDarkTheme ? "border-stone-700 hover:bg-stone-800 text-stone-200" : ""}`}
              >
                <Check className="h-3 w-3" />
                <span>Accept</span>
              </Button>
              <Button
                size="sm"
                onClick={() => onUpdateStatus(order.id, "PREPARING")}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <ChefHat className="h-3.5 w-3.5" />
                <span>Start Preparing</span>
              </Button>
            </>
          )}

          {status === "ACCEPTED" && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(order.id, "PREPARING")}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span>Start Preparing</span>
            </Button>
          )}

          {status === "PREPARING" && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(order.id, "READY")}
              className={`gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md ${
                allItemsChecked ? "ring-2 ring-emerald-400 ring-offset-1" : ""
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Mark Ready</span>
            </Button>
          )}

          {status === "READY" && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(order.id, "SERVED")}
              variant="outline"
              className="gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-black dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>Served to Table</span>
            </Button>
          )}

          {status === "SERVED" && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(order.id, "COMPLETED")}
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
            >
              <span>Complete</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
