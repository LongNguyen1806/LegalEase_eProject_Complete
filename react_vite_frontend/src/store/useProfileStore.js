import { create } from "zustand";

export const useProfileStore = create((set) => ({
  profile: {
    fullname: "",
    avatar: "",
  },

  setProfile: (data) => set({ 
    profile: {
      fullname: data.fullname,
      avatar: data.avatar,
    }
  }),

  updateAvatar: (url) => set((state) => ({
    profile: { ...state.profile, avatar: url }
  })),

  clearProfile: () => set({ 
    profile: { fullname: "", avatar: "" } 
  }),
}));