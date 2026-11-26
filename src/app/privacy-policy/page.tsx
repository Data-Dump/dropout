import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/common/policy-layout";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";

export const metadata: Metadata = {
  title: "Privacy Policy | DROPOUT Cafe & Restro",
  description:
    "Privacy Policy for DROPOUT Cafe & Restro QR POS — how we protect your personal information and transaction details.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="Your privacy is important to us. Learn how we handle your information when you use our digital menu and dining services."
      badge="Data Protection & Privacy"
    >
      {/* 1. Introduction */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          1. Introduction
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          <strong className="text-foreground">{CAFE_DETAILS.name}</strong> (&quot;DROPOUT Cafe&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting the privacy of our customers and visitors. This Privacy Policy describes how we collect, use, and safeguard personal information collected through our web-based QR ordering portal and POS system.
        </p>
        <p className="text-muted-foreground text-xs sm:text-sm">
          This policy adheres to the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 of the Republic of India.
        </p>
      </section>

      {/* 2. Information We Collect */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          2. Information We Collect
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          We collect only the minimal information strictly necessary to process your food orders and provide a seamless dining experience:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Contact & Order Details:</strong> Customer name, phone number, dining table identifier (Table 01–10), and any custom preparation instructions you provide.
          </li>
          <li>
            <strong className="text-foreground">Order & Transaction Logs:</strong> Items ordered, subtotal, billing timestamps, order progress status, payment method selected (UPI or Pay at Counter), and payment gateway reference tokens.
          </li>
          <li>
            <strong className="text-foreground">What We Do NOT Collect:</strong> We never collect, store, or process your credit/debit card numbers, CVVs, netbanking passwords, or UPI PINs. All online payments are securely redirected to and processed by authorized third-party payment aggregators (e.g. PhonePe).
          </li>
        </ul>
      </section>

      {/* 3. Purpose */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          3. How We Use Your Information
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>
            To route your order accurately to our kitchen staff and assign it to your specific dining table.
          </li>
          <li>
            To enable real-time order tracking and provide electronic digital receipts via your browser.
          </li>
          <li>
            To assist our counter staff and duty manager in verifying payments and issuing refunds when applicable.
          </li>
          <li>
            To monitor popular menu dishes, optimize preparation timings, and improve cafe operational efficiency.
          </li>
        </ul>
      </section>

      {/* 4. Local Storage & Cookies */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          4. Cookies & Browser Local Storage
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Our web application uses lightweight browser Local Storage (<code className="text-primary font-mono text-xs">localStorage</code>) to store your temporary dining session. This includes:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>Your currently selected dining table number so you do not have to re-select it with every dish.</li>
          <li>Your active shopping cart items and special cooking notes until your order is submitted.</li>
          <li>Your recent order ID to allow you to check live preparation progress on the order status screen.</li>
        </ul>
        <p className="text-muted-foreground text-xs sm:text-sm">
          We do not use intrusive third-party cross-site advertising cookies or tracking pixels.
        </p>
      </section>

      {/* 5. Data Sharing */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          5. Data Sharing & Non-Disclosure
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          We respect your personal privacy. We do <strong className="text-foreground">not</strong> sell, rent, lease, or trade your personal information to any third-party marketers or advertisers under any circumstances.
        </p>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Information is disclosed only to authorized payment processing partners (for validating UPI transaction completion) or when strictly mandated by applicable law enforcement authorities under official Indian legal statutory requests.
        </p>
      </section>

      {/* 6. Data Security */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          6. Security Measures
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          All communication between your mobile browser and our digital menu runs over encrypted Hypertext Transfer Protocol Secure (HTTPS / SSL/TLS). Backend database records are stored with role-based row-level security (RLS) ensuring that customer data cannot be modified or inspected by unauthorized parties.
        </p>
      </section>

      {/* 7. Grievance Officer */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          7. Grievance Officer & Contact
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of the Grievance Officer are provided below:
        </p>
        <div className="p-3.5 rounded-xl bg-background/70 border border-border text-xs sm:text-sm space-y-1">
          <p className="font-bold text-foreground">Grievance Desk — {CAFE_DETAILS.name}</p>
          <p className="text-muted-foreground">{CAFE_DETAILS.address}, {CAFE_DETAILS.city}</p>
          <p className="text-muted-foreground">
            Email: <a href="mailto:support@dropoutcafe.in" className="text-primary hover:underline">support@dropoutcafe.in</a>
          </p>
          <p className="text-muted-foreground">Phone: +91 83878 98080 / +91 90013 34005</p>
        </div>
      </section>
    </PolicyLayout>
  );
}
