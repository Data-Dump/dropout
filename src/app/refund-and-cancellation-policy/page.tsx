import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/common/policy-layout";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy | DROPOUT Cafe & Restro",
  description:
    "Refund and Cancellation terms for dine-in and takeaway orders placed at DROPOUT Cafe & Restro.",
};

export default function RefundAndCancellationPolicyPage() {
  return (
    <PolicyLayout
      title="Refund and Cancellation Policy"
      subtitle="Clear and fair terms regarding order cancellations, item modifications, and refund timelines."
      badge="Customer Satisfaction"
    >
      {/* 1. Overview */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          1. Overview & Fresh Food Preparation
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          At <strong className="text-foreground">{CAFE_DETAILS.name}</strong>, our kitchen team takes immense pride in handcrafting every dish and beverage fresh upon receiving your order. Because each order is prepared specifically for your dining table, we follow the structured cancellation and refund policy outlined below.
        </p>
      </section>

      {/* 2. Order Cancellation Window */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          2. Order Cancellation Rules
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Before Preparation Begins:</strong> You may cancel or amend your order within <strong className="text-foreground">2 minutes</strong> of placing it, provided our kitchen has not commenced preparation. To request cancellation, immediately notify our floor captain or approach the cash billing counter.
          </p>
          <p>
            <strong className="text-foreground">After Kitchen Preparation Commences:</strong> Once the kitchen ticket is accepted and ingredients are committed to the stove, oven, or blender, <strong className="text-foreground">cancellation cannot be entertained</strong> to prevent food and ingredient wastage.
          </p>
        </div>
      </section>

      {/* 3. Eligibility for Refund */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          3. When Are Refunds Issued?
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          A full or partial refund will be promptly approved under the following genuine circumstances:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Item Unavailable / Out of Stock:</strong> If an ordered dish or beverage cannot be prepared due to stock exhaustion, you may either choose an alternate item or receive an immediate 100% refund for that specific item.
          </li>
          <li>
            <strong className="text-foreground">Payment Deducted but Order Failed:</strong> If your bank account or UPI app was debited but the digital menu did not generate an order confirmation or the payment was double-charged due to network latency.
          </li>
          <li>
            <strong className="text-foreground">Food Quality or Wrong Item:</strong> If an incorrect dish was served or there is an objective defect in preparation (e.g. food burnt or spilled), please notify our floor supervisor immediately upon delivery. We will gladly remake the item fresh or initiate a full refund.
          </li>
        </ul>
      </section>

      {/* 4. Non-Refundable Scenarios */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          4. Non-Refundable Situations
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <li>Change of mind after food has been prepared or served to your table.</li>
          <li>Dislike of taste or personal flavor preferences when the item was prepared correctly according to the standard recipe.</li>
          <li>Customer selecting the incorrect physical table number and leaving the cafe before collecting the order.</li>
        </ul>
      </section>

      {/* 5. Refund Method & Timelines */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          5. Refund Mode & Processing Timelines
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border border-border rounded-xl overflow-hidden">
            <thead className="bg-secondary/60 text-foreground font-bold">
              <tr>
                <th className="p-3 border-b border-border">Payment Method</th>
                <th className="p-3 border-b border-border">Refund Settlement Mode</th>
                <th className="p-3 border-b border-border">Estimated Turnaround</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground">
              <tr>
                <td className="p-3 font-semibold text-foreground">Online UPI / PhonePe</td>
                <td className="p-3">Credited back to the original source UPI / Bank Account</td>
                <td className="p-3">Initiated within 24–48 hours; credited in 5–7 banking days</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Pay at Counter (Cash)</td>
                <td className="p-3">Direct Cash reversal at billing counter</td>
                <td className="p-3">Immediate (on-the-spot)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Pay at Counter (UPI QR)</td>
                <td className="p-3">Direct UPI reversal or cash refund</td>
                <td className="p-3">Immediate or within 24 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Contact for Refund Help */}
      <section className="space-y-3 border-t border-border/60 pt-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground">
          6. How to Request Assistance
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          If you need help regarding any transaction or cancellation, please reach out to our team with your Order ID and payment screenshot:
        </p>
        <div className="p-3.5 rounded-xl bg-background/70 border border-border text-xs sm:text-sm space-y-1">
          <p className="font-bold text-foreground">Customer Support Desk — {CAFE_DETAILS.name}</p>
          <p className="text-muted-foreground">Location: {CAFE_DETAILS.address}, {CAFE_DETAILS.city}</p>
          <p className="text-muted-foreground">
            Phone: <a href="tel:+918387898080" className="text-primary hover:underline">+91 83878 98080</a> / <a href="tel:+919001334005" className="text-primary hover:underline">+91 90013 34005</a>
          </p>
        </div>
      </section>
    </PolicyLayout>
  );
}
