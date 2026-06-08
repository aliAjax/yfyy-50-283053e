import { create } from 'zustand';
import dayjs from 'dayjs';
import type {
  BusinessNotification,
  Complaint,
  DashboardStats,
  DispatchRule,
  ExtensionRequest,
  KnowledgeEntry,
  NotificationType,
  TimelineRecord,
  User,
} from '@/types';
import {
  generateComplaints,
  generateDashboardStats,
  generateExtensionRequests,
  generateNotifications,
} from '@/data/mockData';
import { categories, areas, departments, initialDispatchRules } from '@/data/dictionaries';
import { initialKnowledgeEntries } from '@/data/knowledgeBase';
import { matchDispatchRule } from '@/lib/utils';

export interface PublicComplaintForm {
  title: string;
  categoryId: string;
  areaId: string;
  address?: string;
  contactName: string;
  contactPhone: string;
  content: string;
}

export interface BackendComplaintForm extends PublicComplaintForm {
  departmentId?: string;
}

interface AppState {
  user: User | null;
  complaints: Complaint[];
  extensionRequests: ExtensionRequest[];
  notifications: BusinessNotification[];
  knowledgeEntries: KnowledgeEntry[];
  dispatchRules: DispatchRule[];
  dashboardStats: DashboardStats | null;
  setUser: (user: User | null) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  addKnowledgeEntry: (entry: Omit<KnowledgeEntry, 'id' | 'code' | 'usageCount' | 'updatedAt'>) => void;
  updateKnowledgeEntry: (id: string, updates: Partial<KnowledgeEntry>) => void;
  applyKnowledgeEntry: (id: string) => void;
  addDispatchRule: (rule: Omit<DispatchRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDispatchRule: (id: string, updates: Partial<Omit<DispatchRule, 'id' | 'createdAt'>>) => void;
  deleteDispatchRule: (id: string) => void;
  toggleDispatchRuleStatus: (id: string, enabled: boolean) => void;
  addComplaint: (complaint: Complaint) => void;
  submitPublicComplaint: (values: PublicComplaintForm) => Complaint;
  submitBackendComplaint: (values: BackendComplaintForm) => Complaint;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  addTimeline: (complaintId: string, timeline: Complaint['timelines'][0]) => void;
  addExtensionRequest: (request: ExtensionRequest) => void;
  approveExtension: (id: string, approver: string, remark?: string) => void;
  rejectExtension: (id: string, approver: string, remark?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  getUnreadNotificationCount: () => number;
  refreshStats: () => void;
}

const initialComplaints = generateComplaints(60);
const initialStats = generateDashboardStats(initialComplaints);
const initialExtensions = generateExtensionRequests(initialComplaints);
const initialNotifications = generateNotifications(initialComplaints, initialExtensions);

const notificationTimelineTypes: Partial<Record<TimelineRecord['type'], NotificationType>> = {
  urge: 'urge',
  return: 'return',
  review: 'review',
  delay_approve: 'delay_approve',
  delay_reject: 'delay_reject',
};

const notificationTitleMap: Record<NotificationType, string> = {
  urge: '督办催办提醒',
  delay_request: '延期审批提醒',
  delay_approve: '延期审批通过',
  delay_reject: '延期审批驳回',
  return: '退回重办提醒',
  review: '审核通过提醒',
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  complaints: initialComplaints,
  extensionRequests: initialExtensions,
  notifications: initialNotifications,
  knowledgeEntries: initialKnowledgeEntries,
  dispatchRules: initialDispatchRules,
  dashboardStats: initialStats,

  setUser: (user) => set({ user }),

  getComplaintById: (id) => {
    return get().complaints.find((c) => c.id === id);
  },

  addKnowledgeEntry: (entry) => {
    const nextNumber = get().knowledgeEntries.length + 1;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      knowledgeEntries: [
        {
          ...entry,
          id: `kb-${Date.now()}`,
          code: `KB-${String(nextNumber).padStart(3, '0')}`,
          usageCount: 0,
          updatedAt: now,
        },
        ...state.knowledgeEntries,
      ],
    }));
  },

  updateKnowledgeEntry: (id, updates) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      knowledgeEntries: state.knowledgeEntries.map((entry) =>
        entry.id === id ? { ...entry, ...updates, updatedAt: now } : entry
      ),
    }));
  },

  applyKnowledgeEntry: (id) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      knowledgeEntries: state.knowledgeEntries.map((entry) =>
        entry.id === id
          ? { ...entry, usageCount: entry.usageCount + 1, updatedAt: now }
          : entry
      ),
    }));
  },

  addDispatchRule: (rule) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      dispatchRules: [
        {
          ...rule,
          id: `dr-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        },
        ...state.dispatchRules,
      ],
    }));
  },

  updateDispatchRule: (id, updates) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      dispatchRules: state.dispatchRules.map((rule) =>
        rule.id === id ? { ...rule, ...updates, updatedAt: now } : rule
      ),
    }));
  },

  deleteDispatchRule: (id) => {
    set((state) => ({
      dispatchRules: state.dispatchRules.filter((rule) => rule.id !== id),
    }));
  },

  toggleDispatchRuleStatus: (id, enabled) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      dispatchRules: state.dispatchRules.map((rule) =>
        rule.id === id ? { ...rule, enabled, updatedAt: now } : rule
      ),
    }));
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
    const match = matchDispatchRule(get().dispatchRules, categories, values.categoryId, values.areaId);
    const department = departments.find((d) => d.id === match.rule?.departmentId);
    const hasDepartment = Boolean(department);

    const acceptTimeline: TimelineRecord = {
      id: `${newId}-public-accept`,
      complaintId: newId,
      type: 'accept',
      operator: '公众提交入口',
      content: hasDepartment ? '投诉建议已提交并自动受理，等待系统派单' : '投诉建议已提交并自动受理，未匹配到派单规则，等待人工选择责任单位',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    };

    const assignTimeline: TimelineRecord = {
      id: `${newId}-public-assign`,
      complaintId: newId,
      type: 'assign',
      operator: hasDepartment ? '智能派单系统' : '派单调度台',
      content: hasDepartment
        ? `根据派单规则“${match.rule?.name}”自动匹配至${department?.name}`
        : '未匹配到适用派单规则，需人工选择责任单位',
      createdAt: now.add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      dispatchSource: hasDepartment ? 'rule' : 'pending_manual',
      dispatchRuleId: match.rule?.id,
    };

    const newComplaint: Complaint = {
      id: newId,
      title: values.title,
      content: values.content,
      source: 'web',
      status: hasDepartment ? 'processing' : 'pending_assign',
      categoryId: values.categoryId,
      categoryName: parentCategory
        ? `${parentCategory.name} - ${category?.name || ''}`
        : category?.name || '',
      areaId: values.areaId,
      areaName: area?.name || '',
      departmentId: department?.id || '',
      departmentName: department?.name || '待人工选择',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
      deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      address: values.address,
      dispatchSource: hasDepartment ? 'rule' : 'pending_manual',
      dispatchRuleId: match.rule?.id,
      isRepeat: false,
      urgeCount: 0,
      timelines: [acceptTimeline, assignTimeline],
    };

    get().addComplaint(newComplaint);
    return newComplaint;
  },

  submitBackendComplaint: (values) => {
    const { complaints } = get();
    const now = dayjs();
    const newId = `C${String(complaints.length + 1).padStart(5, '0')}`;

    const category = categories.find((c) => c.id === values.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === values.areaId);
    const match = matchDispatchRule(get().dispatchRules, categories, values.categoryId, values.areaId);
    const matchedDepartment = departments.find((d) => d.id === match.rule?.departmentId);
    const manualDepartment = departments.find((d) => d.id === values.departmentId);
    const department = matchedDepartment || manualDepartment;
    const dispatchSource = matchedDepartment ? 'rule' : manualDepartment ? 'manual' : 'pending_manual';

    const acceptTimeline: TimelineRecord = {
      id: `${newId}-backend-accept`,
      complaintId: newId,
      type: 'accept',
      operator: '后台录入',
      content: dispatchSource === 'pending_manual'
        ? '投诉已受理，未匹配到派单规则，等待人工选择责任单位'
        : '投诉已受理，等待派单',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    };

    const assignTimeline: TimelineRecord = {
      id: `${newId}-backend-assign`,
      complaintId: newId,
      type: 'assign',
      operator: dispatchSource === 'rule' ? '智能派单系统' : '后台录入员',
      content:
        dispatchSource === 'rule'
          ? `根据派单规则“${match.rule?.name}”自动匹配至${department?.name}`
          : dispatchSource === 'manual'
            ? `未匹配到派单规则，由人工选择责任单位${department?.name}`
            : '未匹配到适用派单规则，需人工选择责任单位',
      createdAt: now.add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      dispatchSource,
      dispatchRuleId: match.rule?.id,
    };

    const newComplaint: Complaint = {
      id: newId,
      title: values.title,
      content: values.content,
      source: 'backend',
      status: department ? 'processing' : 'pending_assign',
      categoryId: values.categoryId,
      categoryName: parentCategory
        ? `${parentCategory.name} - ${category?.name || ''}`
        : category?.name || '',
      areaId: values.areaId,
      areaName: area?.name || '',
      departmentId: department?.id || '',
      departmentName: department?.name || '待人工选择',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
      deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      address: values.address,
      dispatchSource,
      dispatchRuleId: match.rule?.id,
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
    const complaint = get().getComplaintById(complaintId);
    const notificationType = notificationTimelineTypes[timeline.type];

    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === complaintId
          ? { ...c, timelines: [...c.timelines, timeline] }
          : c
      ),
      notifications:
        notificationType && complaint
          ? [
              {
                id: `NT-${timeline.id}`,
                type: notificationType,
                title: notificationTitleMap[notificationType],
                content: `${complaint.id} ${complaint.title}：${timeline.content}`,
                createdAt: timeline.createdAt,
                isRead: false,
                complaintId,
                targetPath: `/complaints/${complaintId}`,
              },
              ...state.notifications,
            ]
          : state.notifications,
    }));
  },

  addExtensionRequest: (request) => {
    set((state) => ({
      extensionRequests: [request, ...state.extensionRequests],
      notifications: [
        {
          id: `NT-${request.id}`,
          type: 'delay_request',
          title: notificationTitleMap.delay_request,
          content: `${request.complaintId} ${request.complaintTitle}：${request.departmentName}申请延期${request.days}天`,
          createdAt: request.createdAt,
          isRead: false,
          complaintId: request.complaintId,
          extensionRequestId: request.id,
          targetPath: `/supervision?tab=delay&requestId=${request.id}`,
        },
        ...state.notifications,
      ],
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

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      ),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    }));
  },

  getUnreadNotificationCount: () => {
    return get().notifications.filter((notification) => !notification.isRead).length;
  },

  refreshStats: () => {
    const { complaints } = get();
    const stats = generateDashboardStats(complaints);
    set({ dashboardStats: stats });
  },
}));
