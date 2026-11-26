"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/common/navbar";
import { Footer } from "@/components/common/footer";
import { cn } from "@/lib/utils";

interface PolicyLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  badge?: string;
  children: React.ReactNode;
}

const POLICY_LINKS = [
  { href: "/about-us", label: "About" },
  { href: "/contact-us", label: "Contact" },
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/refund-and-cancellation-policy", label: "Refund" },
];

export function PolicyLayout({ title, subtitle, lastUpdated = "November 2026", badge, children }: PolicyLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border/60 bg-background pt-6 pb-5 px-4 sm:px-6">
        <div className="container max-w-5xl mx-auto space-y-3">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Menu
          </Link>

          <div>
            {badge && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-1.5">
                {badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Last updated: {lastUpdated}</p>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {POLICY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  pathname === link.href
                    ? "bg-primary text-white border-primary"
                    : "bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border/80"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="bg-card rounded-2xl border border-border/80 p-5 sm:p-8 shadow-xs space-y-6 text-sm leading-relaxed">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
