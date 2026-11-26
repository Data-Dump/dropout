"use client";

import React, { useState } from "react";
import { PolicyLayout } from "@/components/common/policy-layout";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
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
import { toast } from "sonner";

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    tableNumber: "",
    subject: "General Feedback",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contact.trim() || !formData.message.trim()) {
      toast.error("Please fill in your name, contact, and message.");
      return;
    }

    setIsSubmitting(true);
    // Simulate query submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success("Thank you! Your message has been received by our cafe manager.");
    }, 600);
  };

  return (
    <PolicyLayout
      title="Contact Us"
      subtitle="Have a question, feedback, or need assistance with your order? We are here to help."
      badge="Get In Touch"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Contact Details & Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Visit or Call Us
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Drop by for coffee or reach out directly to our management desk. We respond promptly during operational hours.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Address */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/80 bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Cafe Location</span>
                <p className="text-muted-foreground">
                  {CAFE_DETAILS.address}
                </p>
                <p className="text-muted-foreground">{CAFE_DETAILS.city}</p>
                <span className="text-[11px] text-primary font-semibold block pt-1">
                  Landmark: Near J.K. Lakshmipat University & Mahindra SEZ
                </span>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/80 bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-foreground block">Phone</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                  <a
                    href="tel:+918387898080"
                    className="text-primary hover:underline font-bold transition-colors"
                  >
                    +91 83878 98080
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a
                    href="tel:+919001334005"
                    className="text-primary hover:underline font-bold transition-colors"
                  >
                    +91 90013 34005
                  </a>
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  Available for orders, reservations & inquiries
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/80 bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Email Desk</span>
                <a
                  href="mailto:contact@dropoutcafe.in"
                  className="text-muted-foreground hover:text-primary font-semibold transition-colors block"
                >
                  contact@dropoutcafe.in
                </a>
                <p className="text-[11px] text-muted-foreground">
                  Support & Feedback: support@dropoutcafe.in
                </p>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/80 bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Operational Hours</span>
                <p className="text-muted-foreground">
                  Monday – Sunday: {CAFE_DETAILS.openingHours}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  (Kitchen last order taken at 11:00 PM)
                </p>
              </div>
            </div>

            {/* Social */}
            {CAFE_DETAILS.instagram && (
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/80 bg-background/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <InstagramIcon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">Instagram</span>
                  <a
                    href={`https://instagram.com/${CAFE_DETAILS.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold block"
                  >
                    {CAFE_DETAILS.instagram}
                  </a>
                  <span className="text-[11px] text-muted-foreground block">
                    Tag us in your campus stories & reels!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact & Feedback Form */}
        <div className="lg:col-span-7 bg-background/50 border border-border/80 rounded-2xl p-5 sm:p-7 space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Send Us a Message</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Dining in right now or have an inquiry? Fill in this form and our duty supervisor will get back to you.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-3 animate-in fade-in duration-300">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-base text-emerald-800 dark:text-emerald-200">
                Message Sent Successfully!
              </h4>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto">
                Thank you for reaching out. A copy of your inquiry has been forwarded to the cafe manager.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    name: "",
                    contact: "",
                    tableNumber: "",
                    subject: "General Feedback",
                    message: "",
                  });
                }}
                className="mt-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Phone or Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 9876543210 or email"
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Subject / Category
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="General Feedback">General Feedback</option>
                    <option value="Current Order Assistance">Current Order Assistance</option>
                    <option value="Table Booking / Party Query">Table Booking / Party Query</option>
                    <option value="Billing or Payment Help">Billing or Payment Help</option>
                    <option value="Food Quality & Suggestions">Food Quality & Suggestions</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Table Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Table 03 (if dining in)"
                    value={formData.tableNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, tableNumber: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="How can we help you today? Please share your thoughts or requirements..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? "Sending..." : "Submit Message"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </PolicyLayout>
  );
}
