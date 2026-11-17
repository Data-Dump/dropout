"use client";

import React, { useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { DROPOUT_TABLES, TableNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function QRCodesView() {
  const [selectedTable, setSelectedTable] = useState<TableNumber>("Table 01");
  const [viewMode, setViewMode] = useState<"single" | "all">("single");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://dropoutcafe.com";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-foreground tracking-tight">
            Table QR Stand Print Hub
          </h3>
          <p className="text-xs text-muted-foreground">
            High-resolution QR code stands tailored for Table 01 through Table 10.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-secondary/50 p-0.5 text-xs font-bold">
            <button
              onClick={() => setViewMode("single")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "single" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Single Stand
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              All 10 Tables Grid
            </button>
          </div>

          <Button onClick={handlePrint} className="h-9 rounded-xl text-xs font-bold gap-1.5 shadow-xs">
            <Printer className="h-4 w-4" />
            <span>Print {viewMode === "all" ? "All Stands" : "Stand"}</span>
          </Button>
        </div>
      </div>

      {/* Mode 1: Single Stand Focus */}
      {viewMode === "single" && (
        <div className="space-y-5">
          {/* Table Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {DROPOUT_TABLES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedTable === t
                    ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Stand Artwork Container */}
          <div className="max-w-md mx-auto rounded-3xl border-2 border-dashed border-border/80 bg-[#FAF8F5] p-8 text-center space-y-5 shadow-sm print:border-none print:shadow-none print:p-0">
            <div className="space-y-2">
              <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-xs border border-stone-200 p-1">
                <Image
                  src="/logo.png"
                  alt="DROPOUT Cafe"
                  width={64}
                  height={64}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-primary block">
                  Scan • Order • Pay
                </span>
                <h2 className="text-3xl font-black tracking-tight text-[#211D1A]">
                  DROPOUT
                </h2>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  Cafe & Restro
                </span>
              </div>
            </div>

            {/* QR Code SVG */}
            <div className="mx-auto inline-block p-5 bg-white rounded-3xl shadow-md border border-stone-200">
              <QRCodeSVG
                value={`${origin}/table/${selectedTable.toLowerCase().replace(/\s+/g, "-").replace("table-", "")}`}
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#211D1A"
                imageSettings={{
                  src: "/logo.png",
                  height: 38,
                  width: 38,
                  excavate: true,
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="inline-block px-5 py-2 rounded-full bg-[#211D1A] text-[#FAF8F5] font-black text-base tracking-wide shadow-sm">
                {selectedTable}
              </div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Scan with any camera app or scanner to browse our digital menu and pay via UPI or at Counter.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: All 10 Tables Grid */}
      {viewMode === "all" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-2">
          {DROPOUT_TABLES.map((t) => {
            const tableSlug = t.toLowerCase().replace(/\s+/g, "-").replace("table-", "");
            const qrUrl = `${origin}/table/${tableSlug}`;

            return (
              <div
                key={t}
                className="rounded-2xl border border-stone-200 bg-[#FAF8F5] p-5 text-center space-y-3 shadow-2xs break-inside-avoid print:border-stone-300"
              >
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary block">
                    DROPOUT CAFE
                  </span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Scan to Order
                  </span>
                </div>

                <div className="inline-block p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                  <QRCodeSVG value={qrUrl} size={110} level="M" fgColor="#211D1A" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#211D1A] text-white font-black text-xs">
                    {t}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
