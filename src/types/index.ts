export type ComplaintSource = 'web' | 'hotline' | 'backend';

export type ComplaintStatus =
  | 'pending_accept'
  | 'pending_assign'
  | 'processing'
  | 'pending_review'
  | 'returned'
  | 'completed'
  | 'overdue';

export type TimelineType =
  | 'accept'
  | 'assign'
  | 'transfer'
  | 'process'
  | 'reply'
  | 'return'
  | 'delay'
  | 'delay_approve'
  | 'delay_reject'
  | 'urge'
  | 'review'
  | 'followup'
  | 'complete'
  | 'merge'
  | 'merged_into';

export type AssignSource = 'auto' | 'manual';

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  children?: Category[];
}

export interface Area {
  id: string;
  name: string;
  level: number;
  parentId?: string;
}

export interface Department {
  id: string;
  name: string;
  type: string;
  contact?: string;
  phone?: string;
  responsibilities?: string;
  address?: string;
}

export interface TimelineRecord {
  id: string;
  complaintId: string;
  type: TimelineType;
  operator: string;
  content: string;
  createdAt: string;
  remark?: string;
  assignSource?: AssignSource;
}

export interface DispatchRule {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  areaId: string;
  areaName: string;
  departmentId: string;
  departmentName: string;
  priority: number;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Complaint {
  id: string;
  title: string;
  content: string;
  source: ComplaintSource;
  status: ComplaintStatus;
  categoryId: string;
  categoryName: string;
  areaId: string;
  areaName: string;
  departmentId: string;
  departmentName: string;
  createdAt: string;
  deadline: string;
  finishedAt?: string;
  contactName: string;
  contactPhone: string;
  address?: string;
  satisfaction?: number;
  isRepeat?: boolean;
  repeatGroupId?: string;
  repeatCount?: number;
  repeatComplaintIds?: string[];
  urgeCount?: number;
  timelines: TimelineRecord[];
  assignSource?: AssignSource;
  dispatchRuleId?: string;
  dispatchRuleName?: string;
}

export interface DuplicateComplaintResult {
  complaint: Complaint;
  similarity: number;
  matchReasons: string[];
  detailScores?: {
    title: { score: number; weight: number; matched: boolean; label: string; detail?: string };
    category: { score: number; weight: number; matched: boolean; label: string; detail?: string };
    area: { score: number; weight: number; matched: boolean; label: string; detail?: string };
    address: { score: number; weight: number; matched: boolean; label: string; detail?: string };
    phone: { score: number; weight: number; matched: boolean; label: string; detail?: string };
  };
}

export interface DuplicateDetectionInput {
  title: string;
  categoryId: string;
  areaId: string;
  address?: string;
  contactPhone: string;
}

export interface DashboardStats {
  totalCount: number;
  processingCount: number;
  completedCount: number;
  overdueCount: number;
  satisfaction: number;
  avgProcessDays: number;
  trendData: { date: string; count: number; completed: number }[];
  categoryData: { name: string; value: number }[];
  sourceData: { name: string; value: number }[];
  areaRank: { name: string; count: number }[];
  repeatTop: { title: string; count: number; area: string }[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  department?: string;
  avatar?: string;
}

export interface ExtensionRequest {
  id: string;
  complaintId: string;
  complaintTitle: string;
  departmentName: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approver?: string;
  approveRemark?: string;
}

export type NotificationType = 'urge' | 'delay_approve' | 'delay_reject' | 'delay_request' | 'return' | 'review_pass' | 'new_complaint';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  complaintId?: string;
  extensionRequestId?: string;
  isRead: boolean;
  createdAt: string;
}

export type ProcessActionType =
  | 'accept'
  | 'assign'
  | 'transfer'
  | 'process'
  | 'return'
  | 'delay_request'
  | 'delay_approve'
  | 'delay_reject'
  | 'urge'
  | 'review_pass'
  | 'review_reject'
  | 'followup'
  | 'complete';

export interface ProcessNode {
  id: string;
  status: ComplaintStatus;
  name: string;
  description: string;
  color: string;
  order: number;
  allowedActions: ProcessActionType[];
}

export interface ProcessAction {
  type: ProcessActionType;
  name: string;
  description: string;
  icon: string;
  fromStatus: ComplaintStatus[];
  toStatus: ComplaintStatus | null;
  timelineType: TimelineType;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  role?: 'operator' | 'supervisor' | 'system';
}

export interface ProcessConfig {
  id: string;
  name: string;
  description: string;
  nodes: ProcessNode[];
  actions: ProcessAction[];
  initialStatus: ComplaintStatus;
  finalStatuses: ComplaintStatus[];
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

export interface SimulationStep {
  id: string;
  actionType: ProcessActionType;
  actionName: string;
  timelineType: TimelineType;
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus | null;
  operator: string;
  operatorRole: SimulationRole;
  content: string;
  timestamp: string;
  remark?: string;
  departmentChanged?: {
    fromDepartmentId: string;
    fromDepartmentName: string;
    toDepartmentId: string;
    toDepartmentName: string;
  };
  deadlineChanged?: {
    fromDeadline: string;
    toDeadline: string;
    days: number;
  };
  notifications?: SimulationNotification[];
  extensionRequestId?: string;
  assignSource?: AssignSource;
  dispatchRuleName?: string;
  satisfaction?: number;
  isSystemStep?: boolean;
}

export interface SimulationState {
  complaintId: string;
  complaintTitle: string;
  complaintContent: string;
  currentStatus: ComplaintStatus;
  history: SimulationStep[];
  startStatus: ComplaintStatus;
  startTimestamp: string;
  currentRole: SimulationRole;
  source: ComplaintSource;
  categoryId: string;
  categoryName: string;
  areaId: string;
  areaName: string;
  departmentId: string;
  departmentName: string;
  createdAt: string;
  deadline: string;
  finishedAt?: string;
  contactName: string;
  contactPhone: string;
  address?: string;
  urgeCount: number;
  notifications: SimulationNotification[];
  extensionRequests: SimulationExtensionRequest[];
  assignSource?: AssignSource;
  dispatchRuleName?: string;
  satisfaction?: number;
}

export type SimulationRole = 'supervisor' | 'operator' | 'system';

export interface SimulationNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  targetRole: Exclude<SimulationRole, 'system'>;
  complaintId: string;
  extensionRequestId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SimulationExtensionRequest {
  id: string;
  complaintId: string;
  complaintTitle: string;
  departmentName: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approver?: string;
  approveRemark?: string;
}

export interface SimulationActionInput {
  content?: string;
  departmentId?: string;
  departmentName?: string;
  days?: number;
  reason?: string;
  assignSource?: AssignSource;
  dispatchRuleName?: string;
  satisfaction?: number;
}

export interface ProcessTraceExport {
  version: string;
  exportedAt: string;
  summary: {
    complaintId: string;
    complaintTitle: string;
    startStatus: ComplaintStatus;
    currentStatus: ComplaintStatus;
    departmentName: string;
    deadline: string;
    finishedAt?: string;
    urgeCount: number;
    notificationCount: number;
    extensionRequestCount: number;
    stepCount: number;
    satisfaction?: number;
  };
  steps: SimulationStep[];
  notifications: SimulationNotification[];
  extensionRequests: SimulationExtensionRequest[];
  timelineText: string;
}

export type KnowledgeStatus = 'active' | 'disabled';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  departmentId: string;
  departmentName: string;
  keywords: string[];
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
  creator: string;
  usageCount: number;
}
