"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Lock, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated, adminLogin } = useRestaurant();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (isAdminAuthenticated) {
    return <>{children}</>;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    const success = adminLogin(pin);
    if (success) {
      toast.success("Admin dashboard unlocked");
      setError(false);
      setPin("");
    } else {
      setError(true);
      toast.error("Invalid Manager or Staff PIN.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-white shadow-md border border-border/70 p-1">
          <Image
            src="/logo.png"
            alt="DROPOUT Cafe"
            width={64}
            height={64}
            className="h-full w-full object-contain"
            priority
          />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Protected Staff Area
          </span>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            DROPOUT POS
          </h1>
          <p className="text-xs text-muted-foreground">
            Enter 4-digit Manager or Staff PIN to access live orders & billing.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              maxLength={4}
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(false);
              }}
              className={`w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:ring-2 ${
                error
                  ? "border-destructive text-destructive focus:ring-destructive"
                  : "border-input focus:ring-primary"
              }`}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl text-xs font-bold gap-2">
            <Lock className="h-4 w-4" />
            <span>Unlock Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
