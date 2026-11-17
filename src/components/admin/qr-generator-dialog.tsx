"use client";

import React, { useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { TableState } from "@/types";
import { DROPOUT_TABLES, TableNumber } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

interface QRGeneratorDialogProps {
  table: TableState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRGeneratorDialog({
  table,
  open,
  onOpenChange,
}: QRGeneratorDialogProps) {
  const [selectedTableNum, setSelectedTableNum] = useState<TableNumber>(
    table?.tableNumber || "Table 01"
  );

  // Update selected if table prop changes
  React.useEffect(() => {
    if (table?.tableNumber) {
      setSelectedTableNum(table.tableNumber);
    }
  }, [table]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://dropoutcafe.com";
  const tableSlug = selectedTableNum.toLowerCase().replace(/\s+/g, "-").replace("table-", "");
  const qrUrl = `${origin}/table/${tableSlug}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Table QR Stand Generator
          </DialogTitle>
          <DialogDescription className="text-xs">
            Printable QR stand artwork for Table 01 to Table 10.
          </DialogDescription>
        </DialogHeader>

        {/* Table Selector Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {DROPOUT_TABLES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTableNum(t)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedTableNum === t
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.replace("Table ", "T-")}
            </button>
          ))}
        </div>

        {/* Printable Stand Artwork Preview */}
        <div className="my-2 rounded-2xl border-2 border-dashed border-border/80 bg-[#FAF8F5] p-6 text-center space-y-4 shadow-sm print:border-none print:shadow-none">
          <div className="space-y-1.5">
            <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-xs border border-stone-200 p-1">
              <Image
                src="/logo.png"
                alt="DROPOUT Cafe"
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-primary block">
              Scan To Order & Pay
            </span>
            <h4 className="text-2xl font-black tracking-tight text-[#211D1A]">
              DROPOUT
            </h4>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">
              Cafe & Restro
            </span>
          </div>

          {/* QR Code Container */}
          <div className="mx-auto inline-block p-4 bg-white rounded-2xl shadow-sm border border-stone-200">
            <QRCodeSVG
              value={qrUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#211D1A"
              imageSettings={{
                src: "/logo.png",
                height: 34,
                width: 34,
                excavate: true,
              }}
            />
          </div>

          <div className="space-y-1">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#211D1A] text-[#FAF8F5] font-extrabold text-sm tracking-wide shadow-xs">
              {selectedTableNum}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Browse menu • UPI / PhonePe • Pay at Counter
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Link
            href={`/table/${tableSlug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Table Page</span>
          </Link>

          <Button onClick={handlePrint} size="sm" className="gap-2 rounded-xl">
            <Printer className="h-4 w-4" />
            <span>Print Stand</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
