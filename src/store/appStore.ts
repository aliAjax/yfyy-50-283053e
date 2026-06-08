import { create } from 'zustand';
import type { Complaint, User, DashboardStats } from '@/types';
import { generateComplaints, generateDashboardStats } from '@/data/mockData';

interface AppState {
  user: User | null;
  complaints: Complaint[];
  dashboardStats: DashboardStats | null;
  setUser: (user: User | null) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  addComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  addTimeline: (complaintId: string, timeline: Complaint['timelines'][0]) => void;
  refreshStats: () => void;
}

const initialComplaints = generateComplaints(60);
const initialStats = generateDashboardStats(initialComplaints);

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  complaints: initialComplaints,
  dashboardStats: initialStats,

  setUser: (user) => set({ user }),

  getComplaintById: (id) => {
    return get().complaints.find((c) => c.id === id);
  },

  addComplaint: (complaint) => {
    set((state) => ({
      complaints: [complaint, ...state.complaints],
    }));
    get().refreshStats();
  },

  updateComplaint: (id, updates) => {
    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    get().refreshStats();
  },

  addTimeline: (complaintId, timeline) => {
    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === complaintId
          ? { ...c, timelines: [...c.timelines, timeline] }
          : c
      ),
    }));
  },

  refreshStats: () => {
    const { complaints } = get();
    const stats = generateDashboardStats(complaints);
    set({ dashboardStats: stats });
  },
}));
