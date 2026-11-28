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
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

interface TableManagementViewProps {
  onOpenQR: (table: TableState) => void;
}

export function TableManagementView({ onOpenQR }: TableManagementViewProps) {
  const { tables, updateTableCapacity, addTable, removeTable } = useRestaurant();

  // Edit Capacity Modal state
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [selectedTableForEdit, setSelectedTableForEdit] = useState<TableState | null>(null);
  const [newCapacity, setNewCapacity] = useState("4");

  // Add Table Modal state
  const [addTableModalOpen, setAddTableModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("4");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddTable = () => {
    // Automatically suggest next sequential table number
    const maxNum = tables.reduce((max, t) => {
      const match = t.tableNumber.match(/\d+/);
      const n = match ? parseInt(match[0], 10) : 0;
      return Math.max(max, n);
    }, 0);

    const nextTableStr = `Table ${(maxNum + 1).toString().padStart(2, "0")}`;
    setNewTableName(nextTableStr);
    setNewTableSeats("4");
    setAddTableModalOpen(true);
  };

  const handleConfirmAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      toast.error("Please enter a table name or number");
      return;
    }

    try {
      setIsSubmitting(true);
      const seats = parseInt(newTableSeats, 10) || 4;
      const success = await addTable(newTableName, seats);
      if (success) {
        setAddTableModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleRemoveTable = async (tbl: TableState) => {
    if (tbl.status !== "available") {
      toast.error(`Cannot remove ${tbl.tableNumber} while it is occupied with active orders.`);
      return;
    }

    if (tables.length <= 1) {
      toast.error("You must have at least one active dining table.");
      return;
    }

    const confirmMsg = `Are you sure you want to remove ${tbl.tableNumber} from the dining floor?`;
    if (window.confirm(confirmMsg)) {
      await removeTable(tbl.tableNumber);
    }
  };

  // Metrics
  const totalTables = tables.length;
  const occupiedCount = tables.filter((t) => t.status === "occupied" || t.status === "needs_attention").length;
  const availableCount = tables.filter((t) => t.status === "available").length;
  const totalSeats = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Dining Floor Management ({totalTables} Tables)</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Add or remove tables, configure seating capacities & print QR table stands.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenAddTable}
            className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Tables
            </span>
            <span className="text-xl font-black text-foreground">{totalTables}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <LayoutGrid className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Available Free
            </span>
            <span className="text-xl font-black text-emerald-600">{availableCount}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Occupied
            </span>
            <span className="text-xl font-black text-amber-600">{occupiedCount}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Capacity
            </span>
            <span className="text-xl font-black text-foreground">{totalSeats} Seats</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-stone-500/10 text-stone-700 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
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
              className={`flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all relative group ${
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

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onOpenQR(tbl)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      title="View & Print QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleRemoveTable(tbl)}
                      disabled={isOccupied}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isOccupied
                          ? "text-muted-foreground/30 cursor-not-allowed"
                          : "text-muted-foreground hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      }`}
                      title={isOccupied ? "Cannot remove occupied table" : "Remove table"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Capacity badge */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                    <Users className="h-3.5 w-3.5" />
                    <span>{tbl.capacity} Seats</span>
                  </div>

                  <button
                    onClick={() => handleOpenEditCapacity(tbl)}
                    className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
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

      {/* Add Table Modal */}
      <Dialog open={addTableModalOpen} onOpenChange={setAddTableModalOpen}>
        <DialogContent className="max-w-xs p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black tracking-tight text-foreground">
              Add New Dining Table
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new table to your dining floor. A QR code standee will be generated automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmAddTable} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Table Name / Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Table 11"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm font-bold focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground">
                Enter name like &quot;Table 11&quot; or just &quot;11&quot;.
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Seating Capacity
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={newTableSeats}
                onChange={(e) => setNewTableSeats(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm font-bold text-center focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddTableModalOpen(false)}
                className="h-9 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-xl text-xs font-bold shadow-xs"
              >
                {isSubmitting ? "Adding..." : "Add Table"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                max={50}
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
