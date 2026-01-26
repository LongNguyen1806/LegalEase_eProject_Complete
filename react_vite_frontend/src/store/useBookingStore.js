import { create } from "zustand";

export const useBookingStore = create((set) => ({
  pendingCount: 0, 
  refundCount: 0,  

  filters: {
    keyword: "",
    status: "All",
    date: "",
    page: 1,
  },

  setPendingCount: (count) => set({ pendingCount: count }),
  setRefundCount: (count) => set({ refundCount: count }),

  setFilters: (newFilters) => 
    set((state) => ({ 
      filters: { ...state.filters, ...newFilters } 
    })),
    
  resetFilters: () => set({ 
    filters: { keyword: "", status: "All", date: "", page: 1 } 
  }),
}));