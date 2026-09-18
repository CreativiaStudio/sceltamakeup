import { create } from "zustand";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface WhatsAppModalState {
  isOpen: boolean;
  prefilledMessage: string;
  sourceContext?: string;
  openModal: (message?: string, sourceContext?: string) => void;
  closeModal: () => void;
}

export const useWhatsAppModalStore = create<WhatsAppModalState>((set) => ({
  isOpen: false,
  prefilledMessage: "Salve Federica, vorrei assistenza su Scelta Makeup",
  sourceContext: undefined,
  openModal: (message) => {
    if (typeof window !== "undefined") {
      window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    }
  },
  closeModal: () => set({ isOpen: false }),
}));
