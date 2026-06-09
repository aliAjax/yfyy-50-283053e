import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Complaint, User, DashboardStats, ExtensionRequest, TimelineRecord, Notification, KnowledgeEntry, DispatchRule, DuplicateComplaintResult, DuplicateDetectionInput, FilterView, ComplaintListFilters, RiskRule, WarningAlert, RiskLevel, WarningStatus } from '@/types';
import { generateComplaints, generateDashboardStats, generateExtensionRequests, generateNotifications, generateKnowledgeEntries, generateDispatchRules, generateRiskRules, generateWarningAlerts } from '@/data/mockData';
import { matchDispatchRule, detectDuplicateComplaints } from '@/lib/utils';

interface PublicComplaintInput {
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  areaId: string;
  areaName: string;
  address: string;
  contactName: string;
  contactPhone: string;
  departmentId: string;
  departmentName: string;
  assignSource?: 'auto' | 'manual';
  dispatchRuleId?: string;
  dispatchRuleName?: string;
}

interface AppState {
  user: User | null;
  complaints: Complaint[];
  extensionRequests: ExtensionRequest[];
  dashboardStats: DashboardStats | null;
  notifications: Notification[];
  knowledgeEntries: KnowledgeEntry[];
  dispatchRules: DispatchRule[];
  riskRules: RiskRule[];
  warningAlerts: WarningAlert[];
  setUser: (user: User | null) => void;
  getComplaintById: (id: string) => Complaint | undefined;
  addComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  addTimeline: (complaintId: string, timeline: Complaint['timelines'][0]) => void;
  addExtensionRequest: (request: ExtensionRequest) => void;
  approveExtension: (id: string, approver: string, remark?: string) => void;
  rejectExtension: (id: string, approver: string, remark?: string) => void;
  refreshStats: () => void;
  submitPublicComplaint: (input: PublicComplaintInput) => Complaint;
  queryComplaintPublic: (id: string, phone: string) => Complaint | null;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  getUnreadNotificationCount: () => number;
  getKnowledgeById: (id: string) => KnowledgeEntry | undefined;
  addKnowledgeEntry: (entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  updateKnowledgeEntry: (id: string, updates: Partial<KnowledgeEntry>) => void;
  toggleKnowledgeStatus: (id: string) => void;
  incrementKnowledgeUsage: (id: string) => void;
  getDispatchRuleById: (id: string) => DispatchRule | undefined;
  addDispatchRule: (rule: Omit<DispatchRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDispatchRule: (id: string, updates: Partial<DispatchRule>) => void;
  deleteDispatchRule: (id: string) => void;
  toggleDispatchRuleStatus: (id: string) => void;
  matchDispatch: (categoryId: string, areaId: string) => ReturnType<typeof matchDispatchRule>;
  detectDuplicates: (input: DuplicateDetectionInput, excludeId?: string) => DuplicateComplaintResult[];
  mergeComplaint: (sourceId: string, targetId: string, operator?: string) => void;
  getRepeatGroup: (groupId: string) => Complaint[];
  batchUrge: (complaintIds: string[], content?: string) => void;
  filterViews: FilterView[];
  addFilterView: (name: string, filters: ComplaintListFilters) => void;
  deleteFilterView: (id: string) => void;
  updateFilterView: (id: string, updates: Partial<FilterView>) => void;
  getRiskRuleById: (id: string) => RiskRule | undefined;
  addRiskRule: (rule: Omit<RiskRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRiskRule: (id: string, updates: Partial<RiskRule>) => void;
  deleteRiskRule: (id: string) => void;
  toggleRiskRuleStatus: (id: string) => void;
  evaluateRiskRules: () => void;
  getWarningById: (id: string) => WarningAlert | undefined;
  updateWarningStatus: (id: string, status: WarningStatus, handler?: string, remark?: string) => void;
  getWarningsByRule: (ruleId: string) => WarningAlert[];
  getWarningsByComplaint: (complaintId: string) => WarningAlert[];
}

const initialComplaints = generateComplaints(60);
const initialStats = generateDashboardStats(initialComplaints);
const initialExtensions = generateExtensionRequests(initialComplaints);
const initialNotifications = generateNotifications(initialComplaints, initialExtensions);
const initialKnowledgeEntries = generateKnowledgeEntries();
const initialDispatchRules = generateDispatchRules();
const initialRiskRules = generateRiskRules();
const initialWarningAlerts = generateWarningAlerts(initialComplaints, initialRiskRules);
const initialFilterViews: FilterView[] = [
  {
    id: 'FV001',
    name: '待处理投诉',
    filters: {
      keyword: '',
      status: 'processing',
      source: undefined,
      categoryId: undefined,
      areaId: undefined,
      departmentId: undefined,
      isRepeat: undefined,
    },
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'FV002',
    name: '超期投诉',
    filters: {
      keyword: '',
      status: 'overdue',
      source: undefined,
      categoryId: undefined,
      areaId: undefined,
      departmentId: undefined,
      isRepeat: undefined,
    },
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'FV003',
    name: '重复投诉',
    filters: {
      keyword: '',
      source: undefined,
      status: undefined,
      categoryId: undefined,
      areaId: undefined,
      departmentId: undefined,
      isRepeat: true,
    },
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  complaints: initialComplaints,
  extensionRequests: initialExtensions,
  dashboardStats: initialStats,
  notifications: initialNotifications,
  knowledgeEntries: initialKnowledgeEntries,
  dispatchRules: initialDispatchRules,
  riskRules: initialRiskRules,
  warningAlerts: initialWarningAlerts,
  filterViews: initialFilterViews,

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

    const complaint = get().getComplaintById(complaintId);
    if (!complaint) return;

    let type: Notification['type'] | null = null;
    let title = '';
    let content = '';

    switch (timeline.type) {
      case 'urge':
        type = 'urge';
        title = '催办通知';
        content = `投诉「${complaint.title}」已被催办，请加快办理进度`;
        break;
      case 'return':
        type = 'return';
        title = '退回重办';
        content = `投诉「${complaint.title}」已被退回重办`;
        break;
      case 'review':
        type = 'review_pass';
        title = '审核通过';
        content = `投诉「${complaint.title}」审核通过，已办结归档`;
        break;
      case 'delay_approve':
        type = 'delay_approve';
        title = '延期申请通过';
        content = `投诉「${complaint.title}」的延期申请已通过`;
        break;
      case 'delay_reject':
        type = 'delay_reject';
        title = '延期申请驳回';
        content = `投诉「${complaint.title}」的延期申请已被驳回`;
        break;
      default:
        break;
    }

    if (type) {
      get().addNotification({
        type,
        title,
        content,
        complaintId,
      });
    }
  },

  addExtensionRequest: (request) => {
    set((state) => ({
      extensionRequests: [request, ...state.extensionRequests],
    }));

    const complaint = get().getComplaintById(request.complaintId);
    if (complaint) {
      get().addNotification({
        type: 'delay_request',
        title: '延期申请待审批',
        content: `${complaint.departmentName} 提交了投诉「${complaint.title}」的延期申请，申请延期 ${request.days} 天`,
        complaintId: request.complaintId,
        extensionRequestId: request.id,
      });
    }
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

  submitPublicComplaint: (input) => {
    const now = dayjs();
    const id = `C${String(get().complaints.length + 1).padStart(5, '0')}`;
    const createdAt = now.format('YYYY-MM-DD HH:mm:ss');
    const deadline = now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss');
    const assignSource = input.assignSource || 'auto';

    const acceptTimeline: TimelineRecord = {
      id: `${id}-t1`,
      complaintId: id,
      type: 'accept',
      operator: '系统自动受理',
      content: '您的投诉已成功提交，系统已自动受理',
      createdAt,
    };

    const assignContent = assignSource === 'auto' && input.dispatchRuleName
      ? `根据派单规则「${input.dispatchRuleName}」自动派单至${input.departmentName}`
      : `派单至${input.departmentName}`;

    const assignTimeline: TimelineRecord = {
      id: `${id}-t2`,
      complaintId: id,
      type: 'assign',
      operator: assignSource === 'auto' ? '智能派单系统' : '人工派单',
      content: assignContent,
      createdAt: now.add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      assignSource,
    };

    const processTimeline: TimelineRecord = {
      id: `${id}-t3`,
      complaintId: id,
      type: 'process',
      operator: `${input.departmentName} 工作人员`,
      content: '责任单位已接收工单，正在安排处理',
      createdAt: now.add(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    };

    const newComplaint: Complaint = {
      id,
      title: input.title,
      content: input.content,
      source: 'web',
      status: 'processing',
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      areaId: input.areaId,
      areaName: input.areaName,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      createdAt,
      deadline,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      address: input.address,
      urgeCount: 0,
      timelines: [acceptTimeline, assignTimeline, processTimeline],
      assignSource,
      dispatchRuleId: input.dispatchRuleId,
      dispatchRuleName: input.dispatchRuleName,
    };

    set((state) => ({
      complaints: [newComplaint, ...state.complaints],
    }));
    get().refreshStats();

    return newComplaint;
  },

  queryComplaintPublic: (id: string, phone: string) => {
    const complaint = get().complaints.find((c) => c.id === id);
    if (!complaint || complaint.contactPhone !== phone) {
      return null;
    }
    return complaint;
  },

  refreshStats: () => {
    const { complaints } = get();
    const stats = generateDashboardStats(complaints);
    set({ dashboardStats: stats });
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },

  addNotification: (notification) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const newNotification: Notification = {
      ...notification,
      id: `NOTIF${Date.now()}`,
      isRead: false,
      createdAt: now,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
  },

  getUnreadNotificationCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
  },

  getKnowledgeById: (id) => {
    return get().knowledgeEntries.find((k) => k.id === id);
  },

  addKnowledgeEntry: (entry) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const maxId = get().knowledgeEntries.reduce((max, k) => {
      const num = parseInt(k.id.replace('KB', ''), 10);
      return num > max ? num : max;
    }, 0);
    const newId = `KB${String(maxId + 1).padStart(4, '0')}`;
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: newId,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };
    set((state) => ({
      knowledgeEntries: [newEntry, ...state.knowledgeEntries],
    }));
  },

  updateKnowledgeEntry: (id, updates) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      knowledgeEntries: state.knowledgeEntries.map((k) =>
        k.id === id ? { ...k, ...updates, updatedAt: now } : k
      ),
    }));
  },

  toggleKnowledgeStatus: (id) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      knowledgeEntries: state.knowledgeEntries.map((k) =>
        k.id === id
          ? { ...k, status: k.status === 'active' ? 'disabled' : 'active', updatedAt: now }
          : k
      ),
    }));
  },

  incrementKnowledgeUsage: (id) => {
    set((state) => ({
      knowledgeEntries: state.knowledgeEntries.map((k) =>
        k.id === id ? { ...k, usageCount: k.usageCount + 1 } : k
      ),
    }));
  },

  getDispatchRuleById: (id) => {
    return get().dispatchRules.find((r) => r.id === id);
  },

  addDispatchRule: (rule) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const maxId = get().dispatchRules.reduce((max, r) => {
      const num = parseInt(r.id.replace('DR', ''), 10);
      return num > max ? num : max;
    }, 0);
    const newId = `DR${String(maxId + 1).padStart(4, '0')}`;
    const newRule: DispatchRule = {
      ...rule,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      dispatchRules: [newRule, ...state.dispatchRules],
    }));
  },

  updateDispatchRule: (id, updates) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      dispatchRules: state.dispatchRules.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: now } : r
      ),
    }));
  },

  deleteDispatchRule: (id) => {
    set((state) => ({
      dispatchRules: state.dispatchRules.filter((r) => r.id !== id),
    }));
  },

  toggleDispatchRuleStatus: (id) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      dispatchRules: state.dispatchRules.map((r) =>
        r.id === id
          ? { ...r, enabled: !r.enabled, updatedAt: now }
          : r
      ),
    }));
  },

  matchDispatch: (categoryId, areaId) => {
    return matchDispatchRule(categoryId, areaId, get().dispatchRules);
  },

  detectDuplicates: (input, excludeId) => {
    return detectDuplicateComplaints(input, get().complaints, { excludeId });
  },

  mergeComplaint: (sourceId, targetId, operator = '系统') => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const sourceComplaint = get().getComplaintById(sourceId);
    const targetComplaint = get().getComplaintById(targetId);

    if (!sourceComplaint || !targetComplaint) return;

    let repeatGroupId = targetComplaint.repeatGroupId;
    if (!repeatGroupId) {
      repeatGroupId = `RG-${targetId}`;
    }

    const repeatComplaintIds = targetComplaint.repeatComplaintIds
      ? [...new Set([...targetComplaint.repeatComplaintIds, sourceId])]
      : [targetId, sourceId];

    const repeatCount = repeatComplaintIds.length;

    set((state) => ({
      complaints: state.complaints.map((c) => {
        if (c.id === targetId) {
          return {
            ...c,
            isRepeat: true,
            repeatGroupId,
            repeatCount,
            repeatComplaintIds,
          };
        }
        if (c.id === sourceId) {
          return {
            ...c,
            isRepeat: true,
            repeatGroupId,
            repeatCount,
            repeatComplaintIds,
          };
        }
        if (c.repeatGroupId === repeatGroupId && c.id !== targetId && c.id !== sourceId) {
          return {
            ...c,
            repeatCount,
            repeatComplaintIds,
          };
        }
        return c;
      }),
    }));

    const sourceMergeTimeline: TimelineRecord = {
      id: `${sourceId}-merge-${Date.now()}`,
      complaintId: sourceId,
      type: 'merged_into',
      operator,
      content: `已合并至投诉 ${targetId}（${targetComplaint.title}）`,
      createdAt: now,
    };
    get().addTimeline(sourceId, sourceMergeTimeline);

    const targetMergeTimeline: TimelineRecord = {
      id: `${targetId}-merge-${Date.now()}`,
      complaintId: targetId,
      type: 'merge',
      operator,
      content: `合并投诉 ${sourceId}（${sourceComplaint.title}），当前重复投诉共 ${repeatCount} 件`,
      createdAt: now,
    };
    get().addTimeline(targetId, targetMergeTimeline);

    get().refreshStats();
  },

  getRepeatGroup: (groupId) => {
    return get().complaints.filter((c) => c.repeatGroupId === groupId);
  },

  batchUrge: (complaintIds, content) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const operator = '督办员';

    set((state) => ({
      complaints: state.complaints.map((c) => {
        if (complaintIds.includes(c.id)) {
          const newTimeline: TimelineRecord = {
            id: `${c.id}-urge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            complaintId: c.id,
            type: 'urge',
            operator,
            content: content || '请加快办理进度，确保按时办结',
            createdAt: now,
          };
          return {
            ...c,
            urgeCount: (c.urgeCount || 0) + 1,
            timelines: [...c.timelines, newTimeline],
          };
        }
        return c;
      }),
    }));

    complaintIds.forEach((id) => {
      const complaint = get().getComplaintById(id);
      if (complaint) {
        get().addNotification({
          type: 'urge',
          title: '催办通知',
          content: `投诉「${complaint.title}」已被催办，请加快办理进度`,
          complaintId: id,
        });
      }
    });
  },

  addFilterView: (name, filters) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const maxId = get().filterViews.reduce((max, v) => {
      const num = parseInt(v.id.replace('FV', ''), 10);
      return num > max ? num : max;
    }, 0);
    const newId = `FV${String(maxId + 1).padStart(3, '0')}`;
    const newView: FilterView = {
      id: newId,
      name,
      filters: { ...filters },
      createdAt: now,
    };
    set((state) => ({
      filterViews: [...state.filterViews, newView],
    }));
  },

  deleteFilterView: (id) => {
    set((state) => ({
      filterViews: state.filterViews.filter((v) => v.id !== id),
    }));
  },

  updateFilterView: (id, updates) => {
    set((state) => ({
      filterViews: state.filterViews.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
  },

  getRiskRuleById: (id) => {
    return get().riskRules.find((r) => r.id === id);
  },

  addRiskRule: (rule) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const maxId = get().riskRules.reduce((max, r) => {
      const num = parseInt(r.id.replace('RR', ''), 10);
      return num > max ? num : max;
    }, 0);
    const newId = `RR${String(maxId + 1).padStart(4, '0')}`;
    const newRule: RiskRule = {
      ...rule,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      riskRules: [newRule, ...state.riskRules],
    }));
    get().evaluateRiskRules();
  },

  updateRiskRule: (id, updates) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      riskRules: state.riskRules.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: now } : r
      ),
    }));
    get().evaluateRiskRules();
  },

  deleteRiskRule: (id) => {
    set((state) => ({
      riskRules: state.riskRules.filter((r) => r.id !== id),
      warningAlerts: state.warningAlerts.filter((a) => a.ruleId !== id),
    }));
  },

  toggleRiskRuleStatus: (id) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      riskRules: state.riskRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled, updatedAt: now } : r
      ),
    }));
    get().evaluateRiskRules();
  },

  evaluateRiskRules: () => {
    const { complaints, riskRules } = get();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const newAlerts: WarningAlert[] = [];
    const existingPending = new Map<string, WarningAlert>();

    get().warningAlerts.forEach((a) => {
      if (a.status === 'pending' || a.status === 'processing') {
        existingPending.set(`${a.ruleId}-${a.complaintId}`, a);
      }
    });

    const enabledRules = riskRules.filter((r) => r.enabled);

    enabledRules.forEach((rule) => {
      const matchedComplaints = complaints.filter((c) => {
        if (rule.scope.type === 'department' && rule.scope.departmentIds?.length) {
          if (!rule.scope.departmentIds.includes(c.departmentId)) return false;
        }
        if (rule.scope.type === 'area' && rule.scope.areaIds?.length) {
          if (!rule.scope.areaIds.includes(c.areaId)) return false;
        }
        if (rule.scope.type === 'category' && rule.scope.categoryIds?.length) {
          const catMatch = rule.scope.categoryIds.some(
            (catId) => c.categoryId === catId || c.categoryId.startsWith(catId + '-')
          );
          if (!catMatch) return false;
        }

        switch (rule.type) {
          case 'expiring': {
            if (c.status === 'completed') return false;
            const daysLeft = dayjs(c.deadline).diff(dayjs(), 'day');
            const threshold = rule.threshold.daysLeft ?? 2;
            return daysLeft >= 0 && daysLeft <= threshold;
          }
          case 'overdue': {
            if (c.status === 'completed') return false;
            return dayjs().isAfter(dayjs(c.deadline));
          }
          case 'multi_urge': {
            if (c.status === 'completed') return false;
            const threshold = rule.threshold.urgeCount ?? 2;
            return (c.urgeCount || 0) >= threshold;
          }
          case 'repeat_cluster': {
            return !!c.isRepeat && (c.repeatCount || 0) >= (rule.threshold.repeatCount ?? 3);
          }
          case 'low_satisfaction': {
            if (c.status !== 'completed') return false;
            const threshold = rule.threshold.satisfactionBelow ?? 3;
            return c.satisfaction !== undefined && c.satisfaction < threshold;
          }
          default:
            return false;
        }
      });

      matchedComplaints.forEach((complaint) => {
        const key = `${rule.id}-${complaint.id}`;
        if (existingPending.has(key)) return;

        let riskLevel: RiskLevel = 'low';
        const daysLeft = dayjs(complaint.deadline).diff(dayjs(), 'day');
        const urgeCount = complaint.urgeCount || 0;

        if (rule.type === 'overdue' || urgeCount >= 3 || daysLeft < 0) {
          riskLevel = 'high';
        } else if ((rule.type === 'expiring' && daysLeft <= 1) || urgeCount >= 2) {
          riskLevel = 'medium';
        }

        const alertId = `WA${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        newAlerts.push({
          id: alertId,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.type,
          complaintId: complaint.id,
          complaintTitle: complaint.title,
          riskLevel,
          status: 'pending',
          triggeredAt: now,
          detail: {},
        });
      });
    });

    if (newAlerts.length > 0) {
      set((state) => ({
        warningAlerts: [...newAlerts, ...state.warningAlerts],
      }));
    }
  },

  getWarningById: (id) => {
    return get().warningAlerts.find((w) => w.id === id);
  },

  updateWarningStatus: (id, status, handler, remark) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      warningAlerts: state.warningAlerts.map((w) =>
        w.id === id
          ? {
              ...w,
              status,
              handledAt: status === 'handled' || status === 'ignored' ? now : undefined,
              handler: handler || w.handler,
              remark: remark || w.remark,
            }
          : w
      ),
    }));
  },

  getWarningsByRule: (ruleId) => {
    return get().warningAlerts.filter((w) => w.ruleId === ruleId);
  },

  getWarningsByComplaint: (complaintId) => {
    return get().warningAlerts.filter((w) => w.complaintId === complaintId);
  },
}));
