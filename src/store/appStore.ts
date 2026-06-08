import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Complaint, User, DashboardStats, ExtensionRequest, TimelineRecord } from '@/types';
import { generateComplaints, generateDashboardStats, generateExtensionRequests } from '@/data/mockData';
import { categories, areas, departments } from '@/data/dictionaries';

export interface PublicComplaintForm {
  title: string;
  categoryId: string;
  areaId: string;
  address?: string;
  contactName: string;
  contactPhone: string;
  content: string;
}

interface AppState {
  user: User | null;
  complaints: Complaint[];
  extensionRequests: ExtensionRequest[];
  dashboardStats: DashboardStats | null;
  setUser: (user: User | null) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  addComplaint: (complaint: Complaint) => void;
  submitPublicComplaint: (values: PublicComplaintForm) => Complaint;
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

  submitPublicComplaint: (values) => {
    const { complaints } = get();
    const now = dayjs();
    const newId = `C${String(complaints.length + 1).padStart(5, '0')}`;

    const category = categories.find((c) => c.id === values.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === values.areaId);
    const department = departments[0];

    const acceptTimeline: TimelineRecord = {
      id: `${newId}-public-accept`,
      complaintId: newId,
      type: 'accept',
      operator: '公众提交入口',
      content: '投诉建议已提交并自动受理，等待系统派单',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    };

    const assignTimeline: TimelineRecord = {
      id: `${newId}-public-assign`,
      complaintId: newId,
      type: 'assign',
      operator: '智能派单系统',
      content: `根据事项分类和所属区域自动派单至${department.name}`,
      createdAt: now.add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    };

    const newComplaint: Complaint = {
      id: newId,
      title: values.title,
      content: values.content,
      source: 'web',
      status: 'processing',
      categoryId: values.categoryId,
      categoryName: parentCategory
        ? `${parentCategory.name} - ${category?.name || ''}`
        : category?.name || '',
      areaId: values.areaId,
      areaName: area?.name || '',
      departmentId: department.id,
      departmentName: department.name,
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
      deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      address: values.address,
      isRepeat: false,
      urgeCount: 0,
      timelines: [acceptTimeline, assignTimeline],
    };

    get().addComplaint(newComplaint);
    return newComplaint;
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
