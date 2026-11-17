"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { TableState } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  QrCode,
  Users,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface TableManagementViewProps {
  onOpenQR: (table: TableState) => void;
}

export function TableManagementView({ onOpenQR }: TableManagementViewProps) {
  const { tables, updateTableCapacity } = useRestaurant();

  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [selectedTableForEdit, setSelectedTableForEdit] = useState<TableState | null>(null);
  const [newCapacity, setNewCapacity] = useState("4");

  const handleOpenEditCapacity = (tbl: TableState) => {
    setSelectedTableForEdit(tbl);
    setNewCapacity(String(tbl.capacity || 4));
    setCapacityModalOpen(true);
  };

  const handleSaveCapacity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForEdit) return;
    updateTableCapacity(selectedTableForEdit.tableNumber, Number(newCapacity) || 4);
    toast.success(`${selectedTableForEdit.tableNumber} seating capacity updated to ${newCapacity}`);
    setCapacityModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-foreground tracking-tight">
            Dining Floor Management (10 Tables)
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure seating capacities, inspect active table bills & print QR table stands.
          </p>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {tables.map((tbl) => {
          const isOccupied = tbl.status === "occupied" || tbl.status === "needs_attention";
          const tableNum = tbl.tableNumber.replace("Table ", "");

          return (
            <div
              key={tbl.tableNumber}
              className={`flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all ${
                tbl.status === "needs_attention"
                  ? "border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-300"
                  : isOccupied
                  ? "border-amber-200 bg-amber-50/20"
                  : "border-border/80 bg-card hover:border-border"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative h-7 w-7 rounded-lg overflow-hidden bg-white border border-border/70 p-0.5 shadow-2xs shrink-0">
                      <Image
                        src="/logo.png"
                        alt="DROPOUT Cafe"
                        width={28}
                        height={28}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                        DROPOUT RESTRO
                      </span>
                      <h4 className="text-xl font-black text-foreground tracking-tight">
                        {tbl.tableNumber}
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenQR(tbl)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="View & Print QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>

                {/* Capacity badge */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                    <Users className="h-3.5 w-3.5" />
                    <span>{tbl.capacity} Seats</span>
                  </div>

                  <button
                    onClick={() => handleOpenEditCapacity(tbl)}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    Edit Seats
                  </button>
                </div>

                {/* Active bill status */}
                <div className="my-3 py-2.5 border-y border-border/50 text-xs space-y-1">
                  {isOccupied ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Total:</span>
                        <span className="font-black text-foreground">
                          {formatCurrency(tbl.activeOrderTotal || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Items Plated:</span>
                        <span className="font-semibold text-foreground">
                          {tbl.activeOrderItemsCount || 0} items
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground py-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Ready for Guests</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Pill & Action */}
              <div className="flex items-center justify-between pt-1">
                {tbl.status === "needs_attention" ? (
                  <Badge variant="emerald" className="text-[10px] py-0 font-bold">
                    Order Ready
                  </Badge>
                ) : isOccupied ? (
                  <Badge variant="amber" className="text-[10px] py-0 font-bold">
                    Occupied
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0 text-muted-foreground font-semibold">
                    Available
                  </Badge>
                )}

                <Link
                  href={`/table/${tableNum}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Open Menu</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Table Seating Capacity Modal */}
      <Dialog open={capacityModalOpen} onOpenChange={setCapacityModalOpen}>
        <DialogContent className="max-w-xs p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black tracking-tight text-foreground">
              Edit {selectedTableForEdit?.tableNumber} Capacity
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure maximum party seating capacity for this dining table.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCapacity} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Seating Capacity
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm font-bold text-center focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCapacityModalOpen(false)}
                className="h-9 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 rounded-xl text-xs font-bold shadow-xs">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
