"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { Navbar } from "@/components/common/navbar";
import { OrderTicketCard } from "@/components/kitchen/order-ticket-card";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { OrderStatus } from "@/types";
import { normalizeOrderStatus } from "@/lib/utils";
import { playNewOrderChime } from "@/lib/audio";
import {
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  Moon,
  Sun,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";

export default function KitchenPage() {
  const { orders, updateOrderStatus } = useRestaurant();
  const [filter, setFilter] = useState<"all_active" | "received" | "preparing" | "ready" | "history">("all_active");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Default to high-contrast dark for kitchen monitors
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Track known orders to sound chime on new arrival
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  // Live Digital Clock
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
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitor incoming new orders and trigger sound chime
  useEffect(() => {
    const currentOrderIds = new Set(orders.map((o) => o.id));

    if (isInitialMount.current) {
      knownOrderIdsRef.current = currentOrderIds;
      isInitialMount.current = false;
      return;
    }

    // Check if any order is new and in "NEW" status
    const newlyArrivedOrders = orders.filter(
      (o) => !knownOrderIdsRef.current.has(o.id) && normalizeOrderStatus(o.status) === "NEW"
    );

    if (newlyArrivedOrders.length > 0 && soundEnabled) {
      playNewOrderChime();
      const first = newlyArrivedOrders[0];
      toast.info(`🔔 New Order from ${first.tableNumber} (${first.orderNumber})!`, {
        duration: 4000,
      });
    }

    knownOrderIdsRef.current = currentOrderIds;
  }, [orders, soundEnabled]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
      toast.error("Fullscreen mode not permitted by browser");
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Filter orders according to tab
  const displayedOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);
      switch (filter) {
        case "received":
          return st === "NEW" || st === "ACCEPTED";
        case "preparing":
          return st === "PREPARING";
        case "ready":
          return st === "READY";
        case "history":
          return st === "SERVED" || st === "COMPLETED";
        case "all_active":
        default:
          return st === "NEW" || st === "ACCEPTED" || st === "PREPARING" || st === "READY";
      }
    });
  }, [orders, filter]);

  // Counts
  const counts = useMemo(() => {
    return {
      all_active: orders.filter((o) => {
        const st = normalizeOrderStatus(o.status);
        return st === "NEW" || st === "ACCEPTED" || st === "PREPARING" || st === "READY";
      }).length,
      received: orders.filter((o) => {
        const st = normalizeOrderStatus(o.status);
        return st === "NEW" || st === "ACCEPTED";
      }).length,
      preparing: orders.filter((o) => normalizeOrderStatus(o.status) === "PREPARING").length,
      ready: orders.filter((o) => normalizeOrderStatus(o.status) === "READY").length,
      history: orders.filter((o) => {
        const st = normalizeOrderStatus(o.status);
        return st === "SERVED" || st === "COMPLETED";
      }).length,
    };
  }, [orders]);

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    toast.success(`Ticket updated to "${status}" — synced with customer tracker`);
  };

  const handleTestChime = () => {
    playNewOrderChime();
    toast.info("Kitchen order chime played");
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDarkTheme ? "bg-[#0F0D0B] text-stone-100" : "bg-[#FAF8F5] text-stone-900"
      }`}
    >
      {!isFullscreen && <Navbar />}

      {/* High-Contrast Kitchen Header */}
      <header
        className={`border-b py-3 px-4 sm:px-6 sticky top-0 z-40 backdrop-blur ${
          isDarkTheme ? "bg-[#181513]/95 border-stone-800" : "bg-card/95 border-border/80"
        }`}
      >
        <div className="container max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Station branding & live connection */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-white shadow-md border border-border/70 p-1">
              <Image
                src="/logo.png"
                alt="DROPOUT Cafe"
                width={44}
                height={44}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">
                  Kitchen Display System (KDS)
                </h1>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Radio className="h-3 w-3 animate-pulse" />
                  <span>Live Feed</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                DROPOUT Cafe Live Kitchen Ticket Stream • 10 Dining Tables
              </p>
            </div>
          </div>

          {/* Controls: Clock, Theme, Sound, Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Clock */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                isDarkTheme ? "bg-stone-900 border-stone-800 text-stone-300" : "bg-secondary border-border text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{currentTime || "12:00:00 PM"}</span>
            </div>

            {/* Kitchen Dark/Light Contrast Toggle */}
            <button
              onClick={() => setIsDarkTheme((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                isDarkTheme
                  ? "bg-stone-900 border-stone-700 text-amber-400 hover:bg-stone-800"
                  : "bg-secondary border-border text-foreground hover:bg-muted"
              }`}
              title="Toggle Kitchen High Contrast Mode"
            >
              {isDarkTheme ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isDarkTheme ? "Day Mode" : "Dark KDS"}</span>
            </button>

            {/* Sound On / Mute Toggle */}
            <button
              onClick={() => {
                setSoundEnabled((v) => !v);
                toast.info(soundEnabled ? "Audio chime muted" : "Audio chime active for new orders");
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                soundEnabled
                  ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600/20"
                  : isDarkTheme
                  ? "bg-stone-900 border-stone-800 text-stone-500"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
              title="Audio Chime"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Chime On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </button>

            {/* Test Audio Chime */}
            <button
              onClick={handleTestChime}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                isDarkTheme ? "bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800" : "bg-card border-border text-foreground hover:bg-muted"
              }`}
              title="Test Kitchen Audio Chime"
            >
              <BellRing className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden md:inline">Test</span>
            </button>

            {/* Fullscreen Mode */}
            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-colors ${
                isFullscreen
                  ? "bg-primary text-primary-foreground border-primary"
                  : isDarkTheme
                  ? "bg-stone-900 border-stone-800 text-stone-200 hover:bg-stone-800"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen KDS"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Exit Full</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Kitchen Status Quick Tabs */}
      <section
        className={`border-b py-2.5 px-4 sm:px-6 sticky ${
          isFullscreen ? "top-14" : "top-14 sm:top-16"
        } z-30 backdrop-blur ${
          isDarkTheme ? "bg-[#181513]/95 border-stone-800" : "bg-[#FAF8F5]/95 border-border/70"
        }`}
      >
        <div className="container max-w-7xl flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter("all_active")}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === "all_active"
                ? "bg-amber-600 text-white shadow-xs"
                : isDarkTheme
                ? "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All Active</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white text-[10px]">
              {counts.all_active}
            </span>
          </button>

          <button
            onClick={() => setFilter("received")}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === "received"
                ? "bg-amber-500 text-stone-950 shadow-xs"
                : isDarkTheme
                ? "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>New Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
              {counts.received}
            </span>
          </button>

          <button
            onClick={() => setFilter("preparing")}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === "preparing"
                ? "bg-amber-700 text-white shadow-xs"
                : isDarkTheme
                ? "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>In Cooking</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
              {counts.preparing}
            </span>
          </button>

          <button
            onClick={() => setFilter("ready")}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === "ready"
                ? "bg-emerald-600 text-white shadow-xs"
                : isDarkTheme
                ? "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Ready for Service</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
              {counts.ready}
            </span>
          </button>

          <button
            onClick={() => setFilter("history")}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === "history"
                ? "bg-stone-700 text-white shadow-xs"
                : isDarkTheme
                ? "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Delivered / History</span>
            <span className="text-[10px] text-muted-foreground">({counts.history})</span>
          </button>
        </div>
      </section>

      {/* Orders Grid */}
      <main className="container max-w-7xl px-4 sm:px-6 py-6 flex-1">
        {displayedOrders.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center ${
              isDarkTheme ? "bg-stone-900 text-emerald-400" : "bg-secondary text-emerald-600"
            }`}>
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="font-black text-lg">Kitchen Board Clean!</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No orders are currently waiting in this filter. As soon as guests scan and place an order from Table 01 to 10, tickets appear here in real time with an audio chime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {displayedOrders.map((order) => (
              <OrderTicketCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                isDarkTheme={isDarkTheme}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
