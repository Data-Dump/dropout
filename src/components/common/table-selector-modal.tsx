"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DROPOUT_TABLES, TableNumber } from "@/lib/utils";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Check, QrCode } from "lucide-react";

interface TableSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (table: TableNumber) => void;
}

export function TableSelectorModal({
  open,
  onOpenChange,
  onSelect,
}: TableSelectorModalProps) {
  const { selectedTable, setSelectedTable, tables } = useRestaurant();

  const handleSelect = (table: TableNumber) => {
    setSelectedTable(table);
    if (onSelect) {
      onSelect(table);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-white border border-border/70 p-0.5 shadow-2xs">
              <Image
                src="/logo.png"
                alt="DROPOUT Cafe"
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-primary font-medium text-[11px] tracking-wider uppercase">
                <QrCode className="h-3.5 w-3.5" />
                <span>Dining Table Selection</span>
              </div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                Select Your Table
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Choose your dining table at DROPOUT Cafe (Tables 01 to 10) to browse and place orders.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
          {DROPOUT_TABLES.map((tableNum) => {
            const isSelected = selectedTable === tableNum;
            const tableState = tables.find((t) => t.tableNumber === tableNum);
            const isOccupied = tableState?.status === "occupied";

            return (
              <button
                key={tableNum}
                onClick={() => handleSelect(tableNum)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center relative ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary"
                    : isOccupied
                    ? "border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-foreground"
                    : "border-border/80 bg-card hover:bg-accent/40 text-foreground"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  T-
                </span>
                <span className="text-lg font-bold">
                  {tableNum.replace("Table ", "")}
                </span>
                <span className="text-[10px] mt-1 font-medium text-muted-foreground">
                  {isOccupied ? "Active" : "Free"}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
