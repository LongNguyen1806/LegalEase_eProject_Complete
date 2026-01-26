import { create } from "zustand";
import axiosClient from "../api/apiAxios";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosClient.get("/notifications");
      const data = (res.data.data || []).map((n) => ({
        ...n,
        isread: Number(n.isread), 
      }));
      set({ notifications: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error("Error fetching notification list:", error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await axiosClient.get("/notifications/unread-count");
      set({ unreadCount: Number(res.data.unread_count) || 0 });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  },

  markAsRead: async (notifId) => {
    const { notifications, unreadCount } = get();

    const target = notifications.find((n) => n.notifid === notifId);
    const wasUnread = target && Number(target.isread) === 0;

    const updatedNotifs = notifications.map((n) => 
      n.notifid === notifId ? { ...n, isread: 1 } : n
    );

    set({
      notifications: updatedNotifs,
      unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
    });

    try {
      await axiosClient.put(`/notifications/${notifId}/mark-as-read`);
    } catch (error) {
      get().fetchNotifications();
      get().fetchUnreadCount();
      console.error("API Error markAsRead:", error);
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isread: 1 })),
      unreadCount: 0,
    }));

    try {
      await axiosClient.put("/notifications/mark-all-as-read");
    } catch (error) {
      get().fetchNotifications();
      get().fetchUnreadCount();
      console.error("API Error markAllAsRead:", error);
    }
  },

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
    }),
}));