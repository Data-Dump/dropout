import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/common/policy-layout";
import {
  Coffee,
  Sparkles,
  Heart,
  Users,
  UtensilsCrossed,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | DROPOUT Cafe & Restro",
  description:
    "Learn about DROPOUT Cafe & Restro — handcrafted coffees, comfort bites, and college memories near J.K. Lakshmipat University, Mahapura, Rajasthan.",
};

export default function AboutUsPage() {
  return (
    <PolicyLayout
      title="About Us"
      subtitle="The story behind DROPOUT Cafe & Restro — artisanal brews, comfort bites, and college memories."
      badge="Our Story & Vision"
    >
      {/* Hero Story */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Brews, Bites & College Memories</span>
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Welcome to <strong className="text-foreground">DROPOUT Cafe & Restro</strong>. Situated near J.K. Lakshmipat University on Mahapura Road (near Mahindra SEZ), DROPOUT was born out of a simple, rebellious belief: the most brilliant ideas, lasting friendships, and greatest memories are not formed inside lecture halls, but around a table with steaming cups of coffee and plates of hot comfort food.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Whether you are catching up between lectures, finishing a deadline, celebrating with friends, or enjoying a quiet moment of caffeine solitude, DROPOUT is your cozy home away from home.
        </p>
      </section>

      {/* Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-background/60 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coffee className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-foreground text-base">Handcrafted Artisanal Brews</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            From signature iced caramel frappes and velvety flat whites to authentic cutting chai and ginger coolers, every sip is brewed to perfection.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-background/60 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-foreground text-base">Freshly Prepared Comfort Bites</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Crispy thin-crust woodfired pizzas, cheesy loaded fries, steamed & pan-fried momos, and hearty burgers made fresh to order with pure ingredients.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-background/60 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-foreground text-base">Modern QR Dining (Tables 01–10)</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            No waiting for waiters or menus. Simply scan your table QR code, browse the live kitchen catalog, place orders directly, and track preparation in real-time.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-background/60 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-foreground text-base">Pocket-Friendly & Transparent</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Student-friendly prices, 0% hidden service surcharges, and flexible payment options including instant UPI or Pay at Counter.
          </p>
        </div>
      </section>

      {/* Our Values */}
      <section className="space-y-4 border-t border-border/60 pt-6">
        <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>Our Commitment to Hygiene & Quality</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Every ingredient in our kitchen is sourced fresh every single morning. We follow strict hygiene and food safety guidelines, maintaining spotless workstations and transparent open kitchen preparation so you can enjoy your meals with complete peace of mind.
        </p>
      </section>

      {/* Cafe Facts */}
      <section className="space-y-4 border-t border-border/60 pt-6">
        <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
          Cafe Quick Facts
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <span className="block text-xl sm:text-2xl font-black text-primary">10</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Dining Tables
            </span>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <span className="block text-xl sm:text-2xl font-black text-primary">100%</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Fresh Daily
            </span>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <span className="block text-xl sm:text-2xl font-black text-primary">0%</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Hidden Fees
            </span>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <span className="block text-xl sm:text-2xl font-black text-primary">14.5 Hrs</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Daily Service
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="p-5 sm:p-6 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-base sm:text-lg">Hungry or Thirsty?</h3>
          <p className="text-xs sm:text-sm text-stone-400">
            Explore our curated menu and order straight to your table.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95"
        >
          <span>Explore Menu</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PolicyLayout>
  );
}
