"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRestaurant } from "@/lib/store/restaurant-store";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated, adminLoginWithCredentials } = useRestaurant();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isAdminAuthenticated) {
    return <>{children}</>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim() || !password.trim()) {
      setErrorMessage("Please enter both account and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await adminLoginWithCredentials(account.trim(), password.trim());
      if (result.success) {
        toast.success("Welcome back! Admin portal unlocked.");
        setAccount("");
        setPassword("");
      } else {
        setErrorMessage(result.error || "Invalid account or password. Please try again.");
        toast.error("Authentication failed");
      }
    } catch {
      setErrorMessage("An unexpected error occurred during authentication.");
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-primary/20">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-xl space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden bg-white shadow-md border border-border/70 p-2">
            <Image
              src="/logo.png"
              alt="DROPOUT Cafe"
              width={80}
              height={80}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-widest">
              <ShieldCheck className="h-3 w-3" />
              <span>Admin Management Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Sign In to POS
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Enter your predefined credentials to access billing, live orders, kitchen display, and financial reports.
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Authentication Error</span>
              <span className="text-[11px] opacity-90">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Account / Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Account / Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="admin@dropoutcafe.in or admin"
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isLoading}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isLoading}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-xs font-bold gap-2 mt-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Verifying with Supabase...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Sign In to Admin</span>
              </>
            )}
          </Button>
        </form>

        {/* Security Footer Note */}
        <div className="pt-2 text-center border-t border-border/50 space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Encrypted cloud session authenticated via Supabase Auth</span>
          </p>
          <span className="text-[10px] text-muted-foreground/70 block">
            DROPOUT Cafe & Restro POS Engine v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
