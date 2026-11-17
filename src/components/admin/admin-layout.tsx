"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { TableState } from "@/types";
import { normalizeOrderStatus } from "@/lib/utils";
import { QRGeneratorDialog } from "./qr-generator-dialog";
import {
  LayoutDashboard,
  BellRing,
  UtensilsCrossed,
  Layers,
  MapPin,
  QrCode,
  CreditCard,
  BarChart3,
  Users2,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  ExternalLink,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: string;
  isExternalRoute?: boolean;
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: BellRing, badgeKey: "activeOrders" },
  { id: "menu", label: "Menu Management", icon: UtensilsCrossed },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "tables", label: "Table Management", icon: MapPin },
  { id: "qr_codes", label: "QR Codes", icon: QrCode },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "reports", label: "Sales Reports", icon: BarChart3 },
  { id: "staff", label: "Staff Management", icon: Users2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const { orders, tables, adminLogout, currentStaff, adminRole } = useRestaurant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedTableForQR, setSelectedTableForQR] = useState<TableState | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // If kitchen role, only orders section is accessible
  const visibleNavItems = React.useMemo(() => {
    if (adminRole === "kitchen") {
      return NAV_ITEMS.filter((item) => item.id === "orders");
    }
    return NAV_ITEMS;
  }, [adminRole]);

  // Keep kitchen role locked to orders view
  useEffect(() => {
    if (adminRole === "kitchen" && activeTab !== "orders") {
      onTabChange("orders");
    }
  }, [adminRole, activeTab, onTabChange]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeOrdersCount = orders.filter((o) => {
    const st = normalizeOrderStatus(o.status);
    return st === "NEW" || st === "ACCEPTED" || st === "PREPARING" || st === "READY";
  }).length;

  const handleOpenQRStand = (tbl: TableState) => {
    setSelectedTableForQR(tbl);
    setQrModalOpen(true);
  };

  const handleNavClick = (item: typeof NAV_ITEMS[number]) => {
    setMobileMenuOpen(false);
    onTabChange(item.id);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 backdrop-blur px-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-foreground hover:bg-muted"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/90 border border-border/70 shadow-2xs">
              <Image
                src="/logo.png"
                alt="DROPOUT Cafe"
                width={32}
                height={32}
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <span className="font-extrabold text-sm tracking-tight">DROPOUT Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {activeOrdersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black animate-pulse">
              {activeOrdersCount} Active
            </span>
          )}
          <button
            onClick={() => {
              adminLogout();
              toast.info("Session locked");
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
            title="Lock Session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border/80 bg-card flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Brand Header */}
          <div className="p-5 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/90 border border-border/70 shadow-2xs">
                <Image
                  src="/logo.png"
                  alt="DROPOUT Cafe"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain p-0.5"
                />
              </div>
              <div>
                <h2 className="font-black text-base text-foreground tracking-tight leading-none">
                  DROPOUT
                </h2>
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase leading-none mt-1 block">
                  Cafe & Restro POS
                </span>
                {adminRole === "kitchen" ? (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[9px] font-extrabold uppercase tracking-wide mt-1.5">
                    Kitchen • Orders Only
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wide mt-1.5">
                    SuperAdmin
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.isExternalRoute && item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-muted-foreground hover:bg-muted hover:text-foreground group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>{item.label}</span>
                    </div>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badgeKey === "activeOrders" && activeOrdersCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? "bg-primary text-white" : "bg-primary/20 text-primary"
                      }`}
                    >
                      {activeOrdersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer with Staff & Lock button */}
          <div className="p-4 border-t border-border/70 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-foreground">
                  {adminRole === "kitchen"
                    ? "Kitchen Station"
                    : currentStaff
                    ? `${currentStaff.name} (SuperAdmin)`
                    : "SuperAdmin"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {adminRole === "kitchen" ? "Orders" : "Full Access"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-secondary text-foreground text-[11px] font-bold hover:bg-secondary/80 transition-colors border border-border/60"
              >
                <span>View Menu</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              <button
                onClick={() => {
                  adminLogout();
                  toast.info("Session locked");
                }}
                className="h-8 px-2.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                title="Lock POS Session"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Admin Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Sub-Bar */}
        <div className="hidden md:flex h-16 items-center justify-between border-b border-border/80 bg-card px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-foreground capitalize tracking-tight">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Dashboard"}
            </h1>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              DROPOUT Cafe & Restro (10 Tables)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Clock */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{currentTime || "IST"}</span>
            </div>

            {/* Quick Stand Generator */}
            <button
              onClick={() => handleOpenQRStand(tables[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Print Table Stands</span>
            </button>
          </div>
        </div>

        {/* Dynamic View Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* QR Generator Dialog */}
      <QRGeneratorDialog
        table={selectedTableForQR}
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
      />
    </div>
  );
}
