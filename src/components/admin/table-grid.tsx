"use client";

import React from "react";
import Link from "next/link";
import { TableState } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QrCode, ArrowUpRight } from "lucide-react";

interface TableGridProps {
  tables: TableState[];
  onOpenQR: (table: TableState) => void;
}

export function TableGrid({ tables, onOpenQR }: TableGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
      {tables.map((tbl) => {
        const isOccupied = tbl.status === "occupied" || tbl.status === "needs_attention";
        const tableNum = tbl.tableNumber.replace("Table ", "");

        return (
          <div
            key={tbl.tableNumber}
            className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all shadow-xs ${
              tbl.status === "needs_attention"
                ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-300"
                : isOccupied
                ? "border-amber-200 bg-amber-50/20"
                : "border-border/80 bg-card hover:border-border"
            }`}
          >
            {/* Top Table Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Dropout
                </span>
                <h3 className="text-xl font-black text-foreground tracking-tight">
                  {tbl.tableNumber}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenQR(tbl)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="View / Print QR Code"
                >
                  <QrCode className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Middle: Active stats or Free status */}
            <div className="my-3 py-2 border-y border-border/50 space-y-1">
              {isOccupied ? (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Active Bill:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(tbl.activeOrderTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Items:</span>
                    <span className="font-medium text-foreground">
                      {tbl.activeOrderItemsCount || 0} items
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Table Free</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1">
              {tbl.status === "needs_attention" ? (
                <Badge variant="emerald" className="text-[10px] py-0 font-bold">
                  Order Ready
                </Badge>
              ) : isOccupied ? (
                <Badge variant="amber" className="text-[10px] py-0">
                  Occupied
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0 text-muted-foreground">
                  Available
                </Badge>
              )}

              <Link
                href={`/table/${tableNum}`}
                className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-0.5"
              >
                <span>View</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
