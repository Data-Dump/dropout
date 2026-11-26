import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/common/policy-layout";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";

export const metadata: Metadata = {
  title: "Terms and Conditions | DROPOUT Cafe & Restro",
  description:
    "Terms and Conditions governing QR dining, orders, billing, and services at DROPOUT Cafe & Restro.",
};

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout
      title="Terms and Conditions"
      subtitle="Please read these terms and conditions carefully before placing orders or using our dining services."
      badge="Legal Agreement"
    >
      {/* 1. Introduction */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          1. Introduction & Acceptance
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          These Terms and Conditions (&quot;Terms&quot;) govern the use of the digital menu, QR table ordering platform, and dining services provided by{" "}
          <strong className="text-foreground">{CAFE_DETAILS.name}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), located at {CAFE_DETAILS.address}, {CAFE_DETAILS.city}.
        </p>
        <p className="text-muted-foreground text-xs sm:text-sm">
          By accessing our digital menu web application, scanning a table QR code, or placing an order at our premises, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please refrain from using our digital ordering system.
        </p>
      </section>

      {/* 2. Service Scope */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          2. Scope of Services & Table Ordering
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          DROPOUT Cafe & Restro operates as a physical dine-in cafe featuring 10 dedicated dining tables (numbered <strong className="text-foreground">Table 01 to Table 10</strong>) along with on-premise takeaway services.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Table Selection:</strong> Customers are responsible for verifying that the table number selected on the digital menu matches their physical dining table to ensure proper food delivery.
          </li>
          <li>
            <strong className="text-foreground">Kitchen Routing:</strong> Once an order is confirmed, it is instantly routed to our Kitchen Display System (KDS) for preparation.
          </li>
          <li>
            <strong className="text-foreground">Service Availability:</strong> Food preparation is subject to kitchen hours (closing at 11:00 PM daily) and ingredient availability.
          </li>
        </ul>
      </section>

      {/* 3. Pricing, GST & Billing */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          3. Pricing, Taxes & Billing
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>
            All prices displayed on the digital menu are in Indian Rupees (₹ / INR).
          </li>
          <li>
            Applicable GST is transparently calculated and displayed in the cart drawer before checkout (currently set at 0% with no hidden packaging or service surcharges for dine-in guests).
          </li>
          <li>
            We reserve the right to revise menu prices, dish descriptions, and combo offerings without prior notice, although any changes will not affect orders already submitted and confirmed.
          </li>
        </ul>
      </section>

      {/* 4. Payment Modes */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          4. Payment Terms & Methods
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          We offer flexible payment options for customer convenience:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Instant UPI / Online:</strong> Secure digital payments facilitated via PhonePe or UPI apps (GPay, Paytm, BHIM, Cred) directly from your mobile device.
          </li>
          <li>
            <strong className="text-foreground">Pay at Counter:</strong> Customers may choose to pay via cash, physical card, or static counter QR code at the cash counter upon dining or order collection.
          </li>
          <li>
            Orders marked as &quot;Pay at Counter&quot; must be cleared prior to leaving the cafe premises.
          </li>
        </ul>
      </section>

      {/* 5. Food Allergies & Dietary Instructions */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          5. Dietary Classification & Allergens
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          We clearly mark dishes as <strong className="text-emerald-600">Veg</strong>, <strong className="text-rose-600">Non-Veg</strong>, or <strong className="text-amber-600">Egg</strong>. However, our kitchen handles ingredients containing dairy (milk, cheese, butter), gluten/wheat, soy, nuts, and spices.
        </p>
        <p className="text-muted-foreground text-xs sm:text-sm">
          If you suffer from severe food allergies or intolerances, please notify our floor supervisor or enter explicit cooking instructions in the special request box during cart checkout. DROPOUT Cafe & Restro cannot guarantee a 100% allergen-free kitchen environment.
        </p>
      </section>

      {/* 6. House Rules & Customer Conduct */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          6. Cafe Etiquette & House Rules
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>
            Outside food and alcoholic beverages are strictly prohibited inside the cafe premises.
          </li>
          <li>
            Please treat fellow guests, staff members, and kitchen crew with dignity and respect.
          </li>
          <li>
            During peak college hours, table seating may be optimized to accommodate waiting guests once meals are completed.
          </li>
        </ul>
      </section>

      {/* 7. Limitation of Liability */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          7. Limitation of Liability
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          To the maximum extent permitted under applicable law, {CAFE_DETAILS.name} shall not be liable for any indirect, incidental, or consequential damages arising from the use of our digital ordering site, unexpected network delays, or third-party payment gateway downtime.
        </p>
      </section>

      {/* 8. Governing Law */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          8. Governing Law & Jurisdiction
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of India. Any disputes or claims arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong className="text-foreground">Jaipur, Rajasthan</strong>.
        </p>
      </section>

      {/* 9. Contact */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          9. Inquiries Regarding Terms
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          For any questions or clarifications regarding these Terms, please contact us at:
        </p>
        <div className="p-3.5 rounded-xl bg-background/70 border border-border text-xs sm:text-sm space-y-1">
          <p className="font-bold text-foreground">{CAFE_DETAILS.name}</p>
          <p className="text-muted-foreground">{CAFE_DETAILS.address}, {CAFE_DETAILS.city}</p>
          <p className="text-muted-foreground">Phone: {CAFE_DETAILS.phone} | Email: contact@dropoutcafe.in</p>
        </div>
      </section>
    </PolicyLayout>
  );
}
