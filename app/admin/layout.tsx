import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Cockpit | Scelta Makeup",
  description: "Suite di Amministrazione Unificata Scelta Makeup",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-root-scope min-h-screen bg-[#FAF7FC]">{children}</div>;
}
