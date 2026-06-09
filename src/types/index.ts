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
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus | null;
  operator: string;
  content: string;
  timestamp: string;
  remark?: string;
}

export interface SimulationState {
  complaintId: string;
  complaintTitle: string;
  currentStatus: ComplaintStatus;
  history: SimulationStep[];
  startStatus: ComplaintStatus;
  startTimestamp: string;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export type RiskRuleType =
  | 'expiring'
  | 'overdue'
  | 'multi_urge'
  | 'repeat_cluster'
  | 'low_satisfaction';

export type RiskRuleScope = 'all' | 'department' | 'area' | 'category';

export interface RiskRuleScopeConfig {
  type: RiskRuleScope;
  departmentIds?: string[];
  areaIds?: string[];
  categoryIds?: string[];
}

export interface RiskRuleThreshold {
  daysLeft?: number;
  urgeCount?: number;
  repeatCount?: number;
  repeatDays?: number;
  satisfactionBelow?: number;
  windowDays?: number;
}

export interface RiskRule {
  id: string;
  name: string;
  type: RiskRuleType;
  description?: string;
  enabled: boolean;
  priority: number;
  threshold: RiskRuleThreshold;
  scope: RiskRuleScopeConfig;
  createdAt: string;
  updatedAt: string;
  creator?: string;
}

export type WarningStatus = 'pending' | 'processing' | 'handled' | 'ignored';

export interface WarningAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleType: RiskRuleType;
  complaintId: string;
  complaintTitle: string;
  riskLevel: RiskLevel;
  status: WarningStatus;
  triggeredAt: string;
  handledAt?: string;
  handler?: string;
  remark?: string;
  detail?: Record<string, string | number | boolean | null | undefined>;
}

export interface ComplaintListFilters {
  keyword: string;
  source?: ComplaintSource;
  status?: ComplaintStatus;
  categoryId?: string;
  areaId?: string;
  departmentId?: string;
  isRepeat?: boolean;
}

export interface FilterView {
  id: string;
  name: string;
  filters: ComplaintListFilters;
  createdAt: string;
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
