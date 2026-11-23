import type { Metadata } from "next";
import InstallAppLandingClient from "@/components/InstallAppLandingClient";

export const metadata: Metadata = {
  title: "Scarica l'App",
  description:
    "Salva l'App ufficiale Scelta Makeup sulla schermata Home del tuo iPhone o Android per seguire i tuoi ordini, riordinare in 1 tap e prenotare in Salone.",
};

export default function DownloadAppPage() {
  return <InstallAppLandingClient />;
}
