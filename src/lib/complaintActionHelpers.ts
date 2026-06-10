import dayjs from 'dayjs';
import { departments } from '@/data/dictionaries';
import type { Complaint, Department, ExtensionRequest, KnowledgeEntry, TimelineRecord } from '@/types';

export const getNowText = () => dayjs().format('YYYY-MM-DD HH:mm:ss');

export const getDepartmentById = (departmentId: string) => {
  return departments.find((department) => department.id === departmentId);
};

export const getDepartmentTypeTagColor = (type: string) => {
  switch (type) {
    case '综合部门':
      return 'blue';
    case '专业部门':
      return 'green';
    case '执法部门':
      return 'red';
    default:
      return 'default';
  }
};

export const buildTransferTimeline = (
  complaintId: string,
  department: Department | undefined,
  reason: string,
  createdAt = getNowText()
): TimelineRecord => ({
  id: `${complaintId}-transfer-${Date.now()}`,
  complaintId,
  type: 'transfer',
  operator: '督办员',
  content: `转办至 ${department?.name || '新责任单位'}，原因：${reason}`,
  createdAt,
});

export const buildDepartmentChange = (
  departmentId: string,
  department: Department | undefined
): Partial<Complaint> => ({
  departmentId,
  departmentName: department?.name || '',
});

export const buildReturnTimeline = (
  complaintId: string,
  reason: string,
  createdAt = getNowText()
): TimelineRecord => ({
  id: `${complaintId}-return-${Date.now()}`,
  complaintId,
  type: 'return',
  operator: '督办员',
  content: `退回重办，原因：${reason}`,
  createdAt,
});

export const buildReturnedStatus = (): Partial<Complaint> => ({
  status: 'returned',
});

export const buildDelayTimeline = (
  complaintId: string,
  days: number,
  reason: string,
  createdAt = getNowText()
): TimelineRecord => ({
  id: `${complaintId}-delay-${Date.now()}`,
  complaintId,
  type: 'delay',
  operator: '责任单位',
  content: `申请延期 ${days} 天，原因：${reason}`,
  createdAt,
});

export const buildExtensionRequest = (
  complaint: Complaint,
  days: number,
  reason: string,
  createdAt = getNowText()
): ExtensionRequest => ({
  id: `EXT-${complaint.id}-${Date.now()}`,
  complaintId: complaint.id,
  complaintTitle: complaint.title,
  departmentName: complaint.departmentName,
  days,
  reason,
  status: 'pending',
  createdAt,
});

export const buildUrgeTimeline = (
  complaintId: string,
  content?: string,
  createdAt = getNowText()
): TimelineRecord => ({
  id: `${complaintId}-urge-${Date.now()}`,
  complaintId,
  type: 'urge',
  operator: '督办员',
  content: `督办催办：${content || '请加快办理进度'}`,
  createdAt,
});

export const buildUrgeCountIncrement = (complaint: Complaint): Partial<Complaint> => ({
  urgeCount: (complaint.urgeCount || 0) + 1,
});

export const buildReviewPassTimeline = (
  complaintId: string,
  remark?: string,
  createdAt = getNowText()
): TimelineRecord => ({
  id: `${complaintId}-review-${Date.now()}`,
  complaintId,
  type: 'review',
  operator: '督办员',
  content: `审核通过，评价：${remark || '办理合格'}`,
  createdAt,
});

export const buildCompleteTimeline = (complaintId: string): TimelineRecord => ({
  id: `${complaintId}-complete-${Date.now()}`,
  complaintId,
  type: 'complete',
  operator: '系统',
  content: '投诉已办结归档',
  createdAt: dayjs().add(1, 'minute').format('YYYY-MM-DD HH:mm:ss'),
});

export const buildCompletedStatus = (satisfaction?: number): Partial<Complaint> => ({
  status: 'completed',
  finishedAt: getNowText(),
  satisfaction: satisfaction || 5,
});

export const buildProcessTimeline = (
  complaintId: string,
  content: string,
  createdAt = getNowText()
): TimelineRecord => ({
  id: `${complaintId}-process-${Date.now()}`,
  complaintId,
  type: 'reply',
  operator: '责任单位',
  content,
  createdAt,
});

export const buildPendingReviewStatus = (): Partial<Complaint> => ({
  status: 'pending_review',
});

export const filterActiveKnowledge = (entries: KnowledgeEntry[]) => {
  return entries.filter((entry) => entry.status === 'active');
};

export const searchKnowledge = (entries: KnowledgeEntry[], keyword: string) => {
  if (!keyword) return entries;

  const normalized = keyword.toLowerCase();
  return entries.filter((entry) => {
    const matchTitle = entry.title.toLowerCase().includes(normalized);
    const matchContent = entry.content.toLowerCase().includes(normalized);
    const matchKeywords = entry.keywords.some((item) => item.toLowerCase().includes(normalized));
    const matchCategory = entry.categoryName.toLowerCase().includes(normalized);
    return matchTitle || matchContent || matchKeywords || matchCategory;
  });
};

export const getRecommendedKnowledge = (entries: KnowledgeEntry[], complaint?: Complaint) => {
  if (!complaint) return [];

  const parentCategoryId = complaint.categoryId.split('-')[0] || '';
  return entries
    .filter((entry) => entry.categoryId === complaint.categoryId || entry.categoryId.startsWith(parentCategoryId))
    .sort((a, b) => b.usageCount - a.usageCount);
};

export const isComplaintOverdue = (complaint: Complaint) => {
  return dayjs().isAfter(dayjs(complaint.deadline)) && complaint.status !== 'completed';
};

export const canTransferComplaint = (complaint: Complaint) => complaint.status === 'processing';
export const canReturnComplaint = (complaint: Complaint) => complaint.status === 'processing';
export const canUrgeComplaint = (complaint: Complaint) => complaint.status === 'processing';
export const canDelayComplaint = (complaint: Complaint) => complaint.status === 'processing';
export const canReviewComplaint = (complaint: Complaint) => complaint.status === 'pending_review';
export const canSubmitProcessResult = (complaint: Complaint) =>
  complaint.status === 'processing' || complaint.status === 'returned';
