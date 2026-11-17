"use client";

import React, { useState } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  RotateCcw,
  ShieldCheck,
  QrCode,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

export function SettingsView() {
  const { resetToDefaults } = useRestaurant();
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleReset = () => {
    if (confirm("Clear local device cache and restore default settings?")) {
      resetToDefaults();
      toast.success("Local cache cleared and settings restored to defaults.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-base font-black text-foreground tracking-tight">
          Restaurant & POS Settings
        </h3>
        <p className="text-xs text-muted-foreground">
          Configure cafe credentials, tax compliance, sound chimes, and payment gateways.
        </p>
      </div>

      {/* Cafe Profile Box */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Store className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-black text-foreground">
            Cafe & Outlet Profile
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Outlet Name
            </span>
            <p className="font-bold text-foreground text-sm">{CAFE_DETAILS.name}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Tagline
            </span>
            <p className="text-foreground">{CAFE_DETAILS.tagline}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Address
            </span>
            <p className="text-foreground">{CAFE_DETAILS.address}, {CAFE_DETAILS.city}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Contact & Social
            </span>
            <p className="text-foreground">{CAFE_DETAILS.phone} • {CAFE_DETAILS.instagram}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Operating Hours
            </span>
            <p className="text-foreground">{CAFE_DETAILS.openingHours}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Dining Table Count
            </span>
            <p className="font-bold text-foreground">10 Fixed Tables (Table 01 to Table 10)</p>
          </div>
        </div>
      </div>

      {/* Tax & Currency Compliance */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-black text-foreground">
            Tax & Currency Compliance (India)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Billing Currency
            </span>
            <p className="font-bold text-foreground text-sm">INR (₹ Indian Rupee)</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              Restaurant GST
            </span>
            <p className="font-bold text-foreground text-sm">0.0% (No GST / Exempt)</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-muted-foreground uppercase tracking-wider block">
              FSSAI / GSTIN Status
            </span>
            <Badge variant="emerald" className="font-bold text-[10px]">
              Active & Validated
            </Badge>
          </div>
        </div>
      </div>

      {/* UPIPay / PhonePe Gateway Config */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <QrCode className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-black text-foreground">
              UPI Gateway Integration (PhonePe UPIPay)
            </h4>
          </div>
          <Badge variant="amber" className="font-bold text-[10px]">
            UAT Sandbox Ready
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Integrated following the <strong>UPIPay</strong> architecture. When live PhonePe Merchant credentials are provided in <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">.env.local</code>, standard checksum verification and S2S webhook callbacks activate automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                Provider
              </span>
              <span className="font-bold text-foreground">PhonePe Standard PG</span>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                Callback Webhook Route
              </span>
              <span className="font-mono text-[11px] text-primary font-bold">/api/payments/phonepe/callback</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Alerts & Notifications */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">
              Order Chime Notifications
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Play alert bell chime whenever a customer submits an order from Table 01-10.
          </p>
        </div>

        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            toast.info(soundEnabled ? "Audio chimes disabled" : "Audio chimes enabled");
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            soundEnabled
              ? "bg-emerald-600 text-white shadow-2xs"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {soundEnabled ? "Active" : "Muted"}
        </button>
      </div>

      {/* Danger Zone: Reset Local Cache */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6 space-y-3">
        <div>
          <h4 className="text-sm font-black text-destructive">
            Reset Local Device Cache
          </h4>
          <p className="text-xs text-muted-foreground">
            Clear browser cached modifications and restore factory defaults for menu, table capacities, and staff duty statuses on this device.
          </p>
        </div>

        <Button
          variant="destructive"
          onClick={handleReset}
          className="h-10 rounded-xl text-xs font-bold gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Clear Local Cache & Reset</span>
        </Button>
      </div>
    </div>
  );
}
