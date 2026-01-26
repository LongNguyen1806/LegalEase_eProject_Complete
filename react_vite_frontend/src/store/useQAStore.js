import { create } from 'zustand';
import axiosClient from '../api/apiAxios';

export const useQAStore = create((set) => ({
  pendingQuestions: [],
  pendingAnswers: [],
  questionsCount: 0, 
  answersCount: 0,  
  loading: false,

  fetchPendingQuestions: async () => {
    set({ loading: true });
    try {
      const response = await axiosClient.get('/admin/qa/questions/pending');
      if (response.data.success) {
        set({
          pendingQuestions: response.data.data,
          questionsCount: response.data.count, 
        });
      }
    } catch (error) {
      console.error("Error fetching pending questions:", error);
    } finally {
      set({ loading: false });
    }
  },

  fetchPendingAnswers: async () => {
    set({ loading: true });
    try {
      const response = await axiosClient.get('/admin/qa/answers/pending');
      if (response.data.success) {
        set({
          pendingAnswers: response.data.data,
          answersCount: response.data.count,
        });
      }
    } catch (error) {
      console.error("Error fetching pending answers:", error);
    } finally {
      set({ loading: false });
    }
  },

  refreshCounts: () => {
    const { fetchPendingQuestions, fetchPendingAnswers } = useQAStore.getState();
    fetchPendingQuestions();
    fetchPendingAnswers();
  },

  clearQAStore: () => set({
    pendingQuestions: [],
    pendingAnswers: [],
    questionsCount: 0,
    answersCount: 0
  })
}));