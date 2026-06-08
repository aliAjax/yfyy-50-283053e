import { create } from 'zustand';
import type { Complaint, User, DashboardStats, ExtensionRequest } from '@/types';
import { generateComplaints, generateDashboardStats, generateExtensionRequests } from '@/data/mockData';

interface AppState {
  user: User | null;
  complaints: Complaint[];
  extensionRequests: ExtensionRequest[];
  dashboardStats: DashboardStats | null;
  setUser: (user: User | null) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  addComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  addTimeline: (complaintId: string, timeline: Complaint['timelines'][0]) => void;
  addExtensionRequest: (request: ExtensionRequest) => void;
  approveExtension: (id: string, approver: string, remark?: string) => void;
  rejectExtension: (id: string, approver: string, remark?: string) => void;
  refreshStats: () => void;
}

const initialComplaints = generateComplaints(60);
const initialStats = generateDashboardStats(initialComplaints);
const initialExtensions = generateExtensionRequests(initialComplaints);

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  complaints: initialComplaints,
  extensionRequests: initialExtensions,
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

  addExtensionRequest: (request) => {
    set((state) => ({
      extensionRequests: [request, ...state.extensionRequests],
    }));
  },

  approveExtension: (id, approver, remark) => {
    const now = new Date().toISOString();
    const request = get().extensionRequests.find((r) => r.id === id);
    if (!request) return;

    set((state) => ({
      extensionRequests: state.extensionRequests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved',
              approvedAt: now,
              approver,
              approveRemark: remark,
            }
          : r
      ),
    }));

    const complaint = get().getComplaintById(request.complaintId);
    if (complaint) {
      const newDeadline = new Date(
        new Date(complaint.deadline).getTime() + request.days * 24 * 60 * 60 * 1000
      ).toISOString();
      get().updateComplaint(request.complaintId, { deadline: newDeadline });
      get().addTimeline(request.complaintId, {
        id: `${request.complaintId}-delay-approve-${Date.now()}`,
        complaintId: request.complaintId,
        type: 'delay_approve',
        operator: approver,
        content: `延期申请已通过，延长 ${request.days} 天${remark ? `，原因：${remark}` : ''}`,
        createdAt: now,
      });
    }
  },

  rejectExtension: (id, approver, remark) => {
    const now = new Date().toISOString();
    const request = get().extensionRequests.find((r) => r.id === id);
    if (!request) return;

    set((state) => ({
      extensionRequests: state.extensionRequests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              approvedAt: now,
              approver,
              approveRemark: remark,
            }
          : r
      ),
    }));

    get().addTimeline(request.complaintId, {
      id: `${request.complaintId}-delay-reject-${Date.now()}`,
      complaintId: request.complaintId,
      type: 'delay_reject',
      operator: approver,
      content: `延期申请已驳回${remark ? `，原因：${remark}` : ''}`,
      createdAt: now,
    });
  },

  refreshStats: () => {
    const { complaints } = get();
    const stats = generateDashboardStats(complaints);
    set({ dashboardStats: stats });
  },
}));
