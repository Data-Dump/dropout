"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/common/navbar";
import { Footer } from "@/components/common/footer";
import {
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Phone,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PolicyLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  badge?: string;
  children: React.ReactNode;
}

const POLICY_LINKS = [
  {
    href: "/about-us",
    label: "About Us",
    icon: Sparkles,
  },
  {
    href: "/contact-us",
    label: "Contact Us",
    icon: Phone,
  },
  {
    href: "/terms-and-conditions",
    label: "Terms & Conditions",
    icon: FileText,
  },
  {
    href: "/privacy-policy",
    label: "Privacy Policy",
    icon: ShieldCheck,
  },
  {
    href: "/refund-and-cancellation-policy",
    label: "Refund & Cancellation",
    icon: RotateCcw,
  },
];

export function PolicyLayout({
  title,
  subtitle,
  lastUpdated = "November 2026",
  badge,
  children,
}: PolicyLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header Banner */}
      <section className="border-b border-border/80 bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5] to-background pt-8 pb-8 px-4 sm:px-6">
        <div className="container max-w-5xl mx-auto space-y-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href="/"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Menu</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-foreground font-semibold truncate">
              {title}
            </span>
          </nav>

          <div className="space-y-2">
            {badge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-wider uppercase">
                {badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Last Updated: <span className="font-semibold text-foreground">{lastUpdated}</span>
            </p>
          </div>

          {/* Quick Policy Switcher Tabs */}
          <div className="pt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {POLICY_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                    isActive
                      ? "bg-primary text-white border-primary shadow-2xs"
                      : "bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border/80"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-10 shadow-2xs space-y-8 text-foreground text-sm sm:text-base leading-relaxed">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
