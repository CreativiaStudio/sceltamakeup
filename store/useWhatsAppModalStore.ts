import { create } from "zustand";

interface WhatsAppModalState {
  isOpen: boolean;
  prefilledMessage: string;
  sourceContext?: string;
  openModal: (message?: string, sourceContext?: string) => void;
  closeModal: () => void;
}

export const useWhatsAppModalStore = create<WhatsAppModalState>((set) => ({
  isOpen: false,
  prefilledMessage: "Salve, vorrei informazioni sui prodotti Scelta Makeup",
  sourceContext: undefined,
  openModal: (message, sourceContext) =>
    set({
      isOpen: true,
      prefilledMessage:
        message || "Salve, vorrei informazioni sui prodotti Scelta Makeup",
      sourceContext,
    }),
  closeModal: () => set({ isOpen: false }),
}));
