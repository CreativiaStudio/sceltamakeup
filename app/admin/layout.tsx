import type { Metadata, Viewport } from "next";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

export const viewport: Viewport = {
  themeColor: "#5E1788",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Admin Cockpit | Scelta Makeup",
  description: "Suite di Amministrazione Unificata Scelta Makeup",
  manifest: "/manifest-admin.webmanifest",
  icons: {
    icon: "/icons/admin-icon-192.png",
    apple: [
      {
        url: "/icons/admin-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Scelta Cockpit",
    statusBarStyle: "black-translucent",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root-scope min-h-screen bg-[#FAF7FC]">
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </div>
  );
}
