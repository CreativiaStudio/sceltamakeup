import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppDemoModal from "@/components/WhatsAppDemoModal";

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
    "Salone ufficiale di alta cosmesi e atelier di bellezza a Napoli (Via dei Pellegrini 28/29). Rivenditore autorizzato Diego della Palma Milano e Cipria Makeup. Spedizione gratuita da 49€, campioncini omaggio e consulenza make-up personalizzata.",
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
      "Atelier di bellezza e cosmesi professionale. Diego della Palma, Cipria Makeup e formule esclusive.",
    images: [
      {
        url: "/brand/logo.png",
        width: 600,
        height: 600,
        alt: "Scelta Makeup Napoli",
      },
    ],
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
        <WhatsAppDemoModal />
      </body>
    </html>
  );
}
