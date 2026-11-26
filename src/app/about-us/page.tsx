import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/common/policy-layout";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | DROPOUT Cafe & Restro",
  description: "DROPOUT Cafe & Restro — handcrafted coffees, comfort bites, and college memories near J.K. Lakshmipat University, Mahapura, Rajasthan.",
};

export default function AboutUsPage() {
  return (
    <PolicyLayout
      title="About Us"
      subtitle="DROPOUT Cafe & Restro — where great food meets great company."
      badge="Our Story"
    >
      <section className="space-y-3">
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">DROPOUT Cafe &amp; Restro</strong> is situated near J.K. Lakshmipat University on Mahapura Road, Rajasthan. We were born out of a simple belief: the best ideas, friendships, and memories happen around a table with great food and coffee — not inside lecture halls.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Whether you&apos;re catching up between classes, celebrating with friends, or just need a quiet caffeine fix, DROPOUT is your go-to spot.
        </p>
      </section>

      <section className="space-y-3 border-t border-border/60 pt-5">
        <h2 className="text-base font-bold text-foreground">What we offer</h2>
        <ul className="space-y-1.5 text-muted-foreground text-sm list-disc list-inside">
          <li>Handcrafted coffees, chai, and cold drinks</li>
          <li>Woodfired pizzas, momos, burgers, and loaded fries</li>
          <li>QR-code table ordering for Tables 01–10</li>
          <li>Student-friendly prices, 0% hidden charges</li>
        </ul>
      </section>

      <div className="pt-2 border-t border-border/60">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all active:scale-95"
        >
          <span>View Menu</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PolicyLayout>
  );
}
