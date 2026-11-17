import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RestaurantProvider } from "@/lib/store/restaurant-store";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DROPOUT Cafe & Restro | QR Menu & Ordering",
  description:
    "Artisanal Brews, Woodfired Comforts & Conversations. Order from your table (Tables 01-10) with instant UPI or Pay at Counter.",
  keywords: [
    "DROPOUT Cafe",
    "QR Menu",
    "Restaurant POS",
    "Specialty Coffee",
    "Woodfired Pizza",
    "Pune Cafe",
  ],
  authors: [{ name: "DROPOUT Cafe & Restro" }],
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <RestaurantProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                borderRadius: "1rem",
              },
            }}
          />
        </RestaurantProvider>
      </body>
    </html>
  );
}
