import React from "react";
import Link from "next/link";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/60 bg-stone-950 text-stone-400 mt-auto pb-[env(safe-area-inset-bottom,0px)]">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Brand */}
          <div>
            <p className="font-black text-white text-sm tracking-tight">DROPOUT</p>
            <p className="text-[11px] text-stone-500 uppercase tracking-widest font-semibold">Cafe &amp; Restro</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            <Link href="/" className="hover:text-white transition-colors">Menu</Link>
            <Link href="/about-us" className="hover:text-white transition-colors">About</Link>
            <Link href="/contact-us" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/terms-and-conditions" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/refund-and-cancellation-policy" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>

          {/* Contact */}
          <div className="text-xs space-y-0.5">
            <p>
              <a href="tel:+918387898080" className="hover:text-white transition-colors">+91 83878 98080</a>
              {" · "}
              <a href="tel:+919001334005" className="hover:text-white transition-colors">+91 90013 34005</a>
            </p>
            <p className="text-stone-600">{CAFE_DETAILS.openingHours} daily</p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-stone-800 text-[11px] text-stone-600">
          © {currentYear} {CAFE_DETAILS.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
