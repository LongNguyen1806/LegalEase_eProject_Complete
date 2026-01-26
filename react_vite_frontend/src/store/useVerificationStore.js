import { create } from "zustand";

export const useVerificationStore = create((set) => ({
  verificationCount: 0,
  
  setVerificationCount: (count) => set({ verificationCount: count }),
  
}));