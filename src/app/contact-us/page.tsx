"use client";

import React, { useState } from "react";
import { PolicyLayout } from "@/components/common/policy-layout";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";
import { MapPin, Phone, Clock } from "lucide-react";
import { toast } from "sonner";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function ContactUsPage() {
  const [formData, setFormData] = useState({ name: "", contact: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contact.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success("Message received. Our team will get back to you.");
    }, 600);
  };

  return (
    <PolicyLayout title="Contact Us" subtitle="Reach out to our team directly." badge="Get In Touch">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Contact Info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background/60 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{CAFE_DETAILS.address}</p>
              <p className="text-muted-foreground text-xs">{CAFE_DETAILS.city}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background/60 text-sm">
            <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <a href="tel:+918387898080" className="block font-semibold text-foreground hover:text-primary transition-colors">+91 83878 98080</a>
              <a href="tel:+919001334005" className="block font-semibold text-foreground hover:text-primary transition-colors">+91 90013 34005</a>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-background/60 text-sm">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-foreground">Daily: {CAFE_DETAILS.openingHours}</p>
          </div>

          {CAFE_DETAILS.instagram && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-background/60 text-sm">
              <InstagramIcon className="h-4 w-4 text-primary shrink-0" />
              <a
                href={`https://instagram.com/${CAFE_DETAILS.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary transition-colors"
              >
                {CAFE_DETAILS.instagram}
              </a>
            </div>
          )}
        </div>

        {/* Message Form */}
        <div className="border border-border/80 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-foreground">Send a message</h3>

          {submitted ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <p className="font-bold text-emerald-800">Message sent!</p>
              <p className="text-xs text-emerald-700">Our team will get back to you shortly.</p>
              <button
                onClick={() => { setSubmitted(false); setFormData({ name: "", contact: "", message: "" }); }}
                className="text-xs font-bold text-emerald-800 underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <input
                type="tel"
                required
                placeholder="Phone number"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <textarea
                required
                rows={4}
                placeholder="Your message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PolicyLayout>
  );
}
