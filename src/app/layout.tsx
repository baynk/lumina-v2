import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumina — Your Celestial Guide",
  description: "Discover your natal chart, daily transits, and personalized cosmic insights. Premium astrology powered by astronomical precision.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0e1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="font-body bg-navy text-cream antialiased min-h-screen">
        {/* Cosmic background orbs */}
        <div className="cosmic-orb cosmic-orb-1" aria-hidden="true" />
        <div className="cosmic-orb cosmic-orb-2" aria-hidden="true" />
        <div className="cosmic-orb cosmic-orb-3" aria-hidden="true" />
        
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
