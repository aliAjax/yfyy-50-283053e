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
  | 'return'
  | 'delay'
  | 'urge'
  | 'review'
  | 'complete';

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
}

export interface TimelineRecord {
  id: string;
  complaintId: string;
  type: TimelineType;
  operator: string;
  content: string;
  createdAt: string;
  remark?: string;
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
  urgeCount?: number;
  timelines: TimelineRecord[];
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
