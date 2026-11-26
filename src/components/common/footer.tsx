import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Coffee,
  ShieldCheck,
  FileText,
  RotateCcw,
  Sparkles,
  Heart,
} from "lucide-react";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/80 bg-stone-900 text-stone-200 mt-auto">
      {/* Upper Footer: Brand, Quick Links, Policies, Contact */}
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-white p-1 shadow-sm">
                <Image
                  src="/logo.png"
                  alt="DROPOUT Cafe & Restro"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  DROPOUT
                </h3>
                <p className="text-[11px] font-bold tracking-widest uppercase text-primary">
                  Cafe & Restro
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              {CAFE_DETAILS.tagline}. Handcrafted artisanal coffees, woodfired
              comforts, and memorable conversations right at your table.
            </p>

            <div className="pt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 text-[11px] font-semibold border border-stone-700/60">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Tables 01 – 10 QR Ordering</span>
              </span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link
                  href="/"
                  className="hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Coffee className="h-3.5 w-3.5 text-stone-500" />
                  <span>Explore Menu</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us"
                  className="hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5 text-stone-500" />
                  <span>About Our Cafe</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Phone className="h-3.5 w-3.5 text-stone-500" />
                  <span>Contact & Location</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Customer Policies */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Policies & Compliance
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:text-primary transition-colors flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5 text-stone-500" />
                  <span>Terms & Conditions</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-primary transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-stone-500" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-and-cancellation-policy"
                  className="hover:text-primary transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-stone-500" />
                  <span>Refund & Cancellation</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Visit & Contact Information */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Visit & Contact
            </h4>
            <div className="space-y-2.5 text-xs text-stone-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {CAFE_DETAILS.address}, {CAFE_DETAILS.city}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a
                  href={`tel:${CAFE_DETAILS.phone.replace(/[^0-9+]/g, "")}`}
                  className="hover:text-primary transition-colors"
                >
                  {CAFE_DETAILS.phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a
                  href="mailto:contact@dropoutcafe.in"
                  className="hover:text-primary transition-colors"
                >
                  contact@dropoutcafe.in
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>Daily: {CAFE_DETAILS.openingHours}</span>
              </div>
              {CAFE_DETAILS.instagram && (
                <div className="flex items-center gap-2.5 pt-1">
                  <InstagramIcon className="h-4 w-4 text-primary shrink-0" />
                  <a
                    href={`https://instagram.com/${CAFE_DETAILS.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {CAFE_DETAILS.instagram}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Note */}
        <div className="mt-10 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>
            © {currentYear} {CAFE_DETAILS.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Crafted with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>for cafe lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
