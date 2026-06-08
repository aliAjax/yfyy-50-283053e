import type { ProcessConfig, ProcessNode, ProcessAction } from '@/types';
import { statusMap, statusColorMap } from './dictionaries';
import dayjs from 'dayjs';

export const defaultProcessNodes: ProcessNode[] = [
  {
    id: 'node-pending-accept',
    status: 'pending_accept',
    name: '待受理',
    description: '投诉已提交，等待受理',
    color: statusColorMap.pending_accept,
    order: 1,
    allowedActions: ['accept'],
  },
  {
    id: 'node-pending-assign',
    status: 'pending_assign',
    name: '待派单',
    description: '投诉已受理，等待派单',
    color: statusColorMap.pending_assign,
    order: 2,
    allowedActions: ['assign'],
  },
  {
    id: 'node-processing',
    status: 'processing',
    name: '办理中',
    description: '责任单位正在办理',
    color: statusColorMap.processing,
    order: 3,
    allowedActions: ['transfer', 'return', 'delay_request', 'urge', 'process'],
  },
  {
    id: 'node-returned',
    status: 'returned',
    name: '已退回',
    description: '办理不合格，已退回重办',
    color: statusColorMap.returned,
    order: 4,
    allowedActions: ['process', 'transfer', 'delay_request', 'urge'],
  },
  {
    id: 'node-pending-review',
    status: 'pending_review',
    name: '待审核',
    description: '办理结果已提交，等待审核',
    color: statusColorMap.pending_review,
    order: 5,
    allowedActions: ['review_pass', 'review_reject'],
  },
  {
    id: 'node-completed',
    status: 'completed',
    name: '已办结',
    description: '投诉已办结归档',
    color: statusColorMap.completed,
    order: 6,
    allowedActions: ['followup'],
  },
  {
    id: 'node-overdue',
    status: 'overdue',
    name: '已超期',
    description: '投诉办理已超期',
    color: statusColorMap.overdue,
    order: 7,
    allowedActions: ['urge', 'process', 'transfer'],
  },
];

export const defaultProcessActions: ProcessAction[] = [
  {
    type: 'accept',
    name: '受理',
    description: '受理投诉',
    icon: 'check',
    fromStatus: ['pending_accept'],
    toStatus: 'pending_assign',
    timelineType: 'accept',
    role: 'supervisor',
  },
  {
    type: 'assign',
    name: '派单',
    description: '将投诉派单至责任单位',
    icon: 'send',
    fromStatus: ['pending_assign'],
    toStatus: 'processing',
    timelineType: 'assign',
    requiresInput: true,
    inputLabel: '派单说明',
    inputPlaceholder: '请输入派单说明',
    role: 'supervisor',
  },
  {
    type: 'transfer',
    name: '转办',
    description: '将投诉转至其他责任单位',
    icon: 'arrow-right',
    fromStatus: ['processing', 'returned', 'overdue'],
    toStatus: null,
    timelineType: 'transfer',
    requiresInput: true,
    inputLabel: '转办原因',
    inputPlaceholder: '请输入转办原因',
    role: 'supervisor',
  },
  {
    type: 'process',
    name: '提交办理结果',
    description: '责任单位提交办理结果',
    icon: 'file-check',
    fromStatus: ['processing', 'returned', 'overdue'],
    toStatus: 'pending_review',
    timelineType: 'reply',
    requiresInput: true,
    inputLabel: '办理结果',
    inputPlaceholder: '请详细描述办理过程和结果',
    role: 'operator',
  },
  {
    type: 'return',
    name: '退回重办',
    description: '将投诉退回责任单位重办',
    icon: 'rotate-ccw',
    fromStatus: ['processing', 'pending_review'],
    toStatus: 'returned',
    timelineType: 'return',
    requiresInput: true,
    inputLabel: '退回原因',
    inputPlaceholder: '请详细说明退回原因和整改要求',
    role: 'supervisor',
  },
  {
    type: 'delay_request',
    name: '申请延期',
    description: '申请延长办理期限',
    icon: 'clock',
    fromStatus: ['processing', 'returned'],
    toStatus: null,
    timelineType: 'delay',
    requiresInput: true,
    inputLabel: '延期原因',
    inputPlaceholder: '请详细说明延期原因',
    role: 'operator',
  },
  {
    type: 'delay_approve',
    name: '批准延期',
    description: '批准延期申请',
    icon: 'thumbs-up',
    fromStatus: ['processing', 'returned'],
    toStatus: null,
    timelineType: 'delay_approve',
    requiresInput: true,
    inputLabel: '审批意见',
    inputPlaceholder: '请输入审批意见',
    role: 'supervisor',
  },
  {
    type: 'delay_reject',
    name: '驳回延期',
    description: '驳回延期申请',
    icon: 'thumbs-down',
    fromStatus: ['processing', 'returned'],
    toStatus: null,
    timelineType: 'delay_reject',
    requiresInput: true,
    inputLabel: '驳回原因',
    inputPlaceholder: '请输入驳回原因',
    role: 'supervisor',
  },
  {
    type: 'urge',
    name: '督办催办',
    description: '催促责任单位加快办理',
    icon: 'bell',
    fromStatus: ['processing', 'returned', 'overdue'],
    toStatus: null,
    timelineType: 'urge',
    requiresInput: true,
    inputLabel: '催办内容',
    inputPlaceholder: '请输入催办内容',
    role: 'supervisor',
  },
  {
    type: 'review_pass',
    name: '审核通过',
    description: '审核通过办理结果',
    icon: 'check-circle',
    fromStatus: ['pending_review'],
    toStatus: 'completed',
    timelineType: 'review',
    requiresInput: true,
    inputLabel: '审核意见',
    inputPlaceholder: '请输入审核意见',
    role: 'supervisor',
  },
  {
    type: 'review_reject',
    name: '审核退回',
    description: '审核不通过，退回重办',
    icon: 'x-circle',
    fromStatus: ['pending_review'],
    toStatus: 'returned',
    timelineType: 'return',
    requiresInput: true,
    inputLabel: '退回原因',
    inputPlaceholder: '请详细说明退回原因',
    role: 'supervisor',
  },
  {
    type: 'followup',
    name: '回访记录',
    description: '记录群众回访结果',
    icon: 'phone',
    fromStatus: ['completed'],
    toStatus: null,
    timelineType: 'followup',
    requiresInput: true,
    inputLabel: '回访记录',
    inputPlaceholder: '请记录回访内容和群众反馈',
    role: 'supervisor',
  },
  {
    type: 'complete',
    name: '办结归档',
    description: '投诉办结并归档',
    icon: 'archive',
    fromStatus: ['pending_review'],
    toStatus: 'completed',
    timelineType: 'complete',
    role: 'system',
  },
];

export const defaultProcessConfig: ProcessConfig = {
  id: 'PROC-DEFAULT-001',
  name: '标准投诉处理流程',
  description: '投诉从受理、派单、办理、审核、回访到归档的标准流转流程',
  nodes: defaultProcessNodes,
  actions: defaultProcessActions,
  initialStatus: 'pending_accept',
  finalStatuses: ['completed'],
  createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  enabled: true,
};

export const getAvailableActions = (
  status: string,
  actions: ProcessAction[]
): ProcessAction[] => {
  return actions.filter((a) => a.fromStatus.includes(status as any));
};

export const getNodeByStatus = (
  status: string,
  nodes: ProcessNode[]
): ProcessNode | undefined => {
  return nodes.find((n) => n.status === status);
};

export const simulateAction = (
  currentStatus: string,
  action: ProcessAction,
  operator: string,
  content: string
): { newStatus: string | null; timelineContent: string; timelineType: string } => {
  const newStatus = action.toStatus;
  const timelineContent = content || action.description;
  const timelineType = action.timelineType;

  return {
    newStatus,
    timelineContent,
    timelineType,
  };
};
