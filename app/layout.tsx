import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sceltamakeup.it"),
  title: {
    default: "Scelta Makeup | L'eleganza di essere autentica",
    template: "%s | Scelta Makeup",
  },
  description:
    "Boutique ufficiale di alta cosmesi ed e-commerce nazionale. Rivenditore autorizzato Diego della Palma Milano e Cipria Make Up. Spedizione gratuita da 49€, consegna rapida 24/48h e atelier di bellezza a Napoli.",
  keywords: [
    "Scelta Makeup",
    "Diego della Palma Napoli",
    "Cipria Makeup",
    "Salone bellezza Napoli",
    "Via dei Pellegrini 28",
    "rossetto geisha matte",
    "fondotinta lifting glow",
    "mascara 3d ciglia finte",
    "trucco professionale Napoli",
  ],
  authors: [{ name: "Scelta Makeup & Creativia Studio" }],
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://www.sceltamakeup.it",
    siteName: "Scelta Makeup",
    title: "Scelta Makeup — L'eleganza di essere autentica",
    description:
      "Atelier di bellezza e cosmesi professionale a Napoli. Rivenditore autorizzato Diego della Palma Milano e Cipria Make Up. Spedizioni 24/48h gratuite da 49€.",
    images: [
      {
        url: "https://www.sceltamakeup.it/brand/og-image.jpg",
        secureUrl: "https://www.sceltamakeup.it/brand/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Scelta Makeup — Boutique & Alta Cosmesi Napoli",
      },
      {
        url: "https://www.sceltamakeup.it/brand/og-square.jpg",
        secureUrl: "https://www.sceltamakeup.it/brand/og-square.jpg",
        width: 800,
        height: 800,
        type: "image/jpeg",
        alt: "Scelta Makeup Napoli Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scelta Makeup — L'eleganza di essere autentica",
    description:
      "Boutique ufficiale di alta cosmesi ed e-commerce nazionale. Diego della Palma Milano e Cipria Make Up. Spedizioni rapide in tutta Italia.",
    images: ["https://www.sceltamakeup.it/brand/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#1F1B24] [overflow-anchor:none]">
        <Suspense fallback={<div className="h-20 bg-white" />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <WhatsAppFloatingButton />
      </body>
    </html>
  );
}
