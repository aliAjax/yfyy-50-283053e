import type { Category, Area, Department } from '@/types';

export const categories: Category[] = [
  { id: 'c1', name: '城市管理', parentId: undefined },
  { id: 'c1-1', name: '市容环境', parentId: 'c1' },
  { id: 'c1-2', name: '违章建筑', parentId: 'c1' },
  { id: 'c1-3', name: '占道经营', parentId: 'c1' },
  { id: 'c2', name: '交通运输', parentId: undefined },
  { id: 'c2-1', name: '道路交通', parentId: 'c2' },
  { id: 'c2-2', name: '公共交通', parentId: 'c2' },
  { id: 'c2-3', name: '停车管理', parentId: 'c2' },
  { id: 'c3', name: '环境保护', parentId: undefined },
  { id: 'c3-1', name: '噪音污染', parentId: 'c3' },
  { id: 'c3-2', name: '大气污染', parentId: 'c3' },
  { id: 'c3-3', name: '水污染', parentId: 'c3' },
  { id: 'c4', name: '市政设施', parentId: undefined },
  { id: 'c4-1', name: '供水供电', parentId: 'c4' },
  { id: 'c4-2', name: '道路养护', parentId: 'c4' },
  { id: 'c4-3', name: '园林绿化', parentId: 'c4' },
  { id: 'c5', name: '住房物业', parentId: undefined },
  { id: 'c5-1', name: '物业管理', parentId: 'c5' },
  { id: 'c5-2', name: '房屋质量', parentId: 'c5' },
];

export const areas: Area[] = [
  { id: 'a1', name: '东城区', level: 1 },
  { id: 'a2', name: '西城区', level: 1 },
  { id: 'a3', name: '朝阳区', level: 1 },
  { id: 'a4', name: '海淀区', level: 1 },
  { id: 'a5', name: '丰台区', level: 1 },
  { id: 'a6', name: '石景山区', level: 1 },
  { id: 'a7', name: '通州区', level: 1 },
  { id: 'a8', name: '大兴区', level: 1 },
];

export const departments: Department[] = [
  {
    id: 'd1',
    name: '城市管理委员会',
    type: '综合部门',
    contactName: '张明',
    contactPhone: '010-86570001',
    responsibilities: ['市容环境整治', '占道经营处置', '违法建设协调', '城市运行综合治理'],
  },
  {
    id: 'd2',
    name: '交通运输局',
    type: '专业部门',
    contactName: '李慧',
    contactPhone: '010-86570002',
    responsibilities: ['公共交通服务', '客运秩序管理', '道路运输协调', '交通行业投诉办理'],
  },
  {
    id: 'd3',
    name: '生态环境局',
    type: '专业部门',
    contactName: '王磊',
    contactPhone: '010-86570003',
    responsibilities: ['噪音污染处置', '大气污染监管', '水环境问题核查', '环境执法联动'],
  },
  {
    id: 'd4',
    name: '住房和城乡建设局',
    type: '专业部门',
    contactName: '赵妍',
    contactPhone: '010-86570004',
    responsibilities: ['物业管理协调', '房屋质量投诉', '道路养护统筹', '建设工程问题处理'],
  },
  {
    id: 'd5',
    name: '园林绿化局',
    type: '专业部门',
    contactName: '陈晨',
    contactPhone: '010-86570005',
    responsibilities: ['绿地养护', '树木修剪', '园林设施维护', '绿化占用核查'],
  },
  {
    id: 'd6',
    name: '水务局',
    type: '专业部门',
    contactName: '刘洋',
    contactPhone: '010-86570006',
    responsibilities: ['供水排水协调', '河道管理', '积水点处置', '水务设施维护'],
  },
  {
    id: 'd7',
    name: '市场监督管理局',
    type: '综合部门',
    contactName: '孙洁',
    contactPhone: '010-86570007',
    responsibilities: ['消费投诉处理', '市场经营秩序', '食品安全监管', '价格计量问题核查'],
  },
  {
    id: 'd8',
    name: '公安局交通管理局',
    type: '执法部门',
    contactName: '周强',
    contactPhone: '010-86570008',
    responsibilities: ['道路交通秩序', '交通设施维护', '停车违法处置', '交通安全隐患排查'],
  },
];

export const sourceMap: Record<string, string> = {
  web: '网页提交',
  hotline: '热线导入',
  backend: '后台录入',
};

export const statusMap: Record<string, string> = {
  pending_accept: '待受理',
  pending_assign: '待派单',
  processing: '办理中',
  pending_review: '待审核',
  returned: '已退回',
  completed: '已办结',
  overdue: '已超期',
};

export const statusColorMap: Record<string, string> = {
  pending_accept: 'default',
  pending_assign: 'default',
  processing: 'processing',
  pending_review: 'warning',
  returned: 'error',
  completed: 'success',
  overdue: 'error',
};

export const timelineTypeMap: Record<string, string> = {
  accept: '投诉受理',
  assign: '派单',
  transfer: '转办',
  process: '办理反馈',
  reply: '办理回复',
  return: '退回重办',
  delay: '延期申请',
  delay_approve: '延期通过',
  delay_reject: '延期驳回',
  urge: '督办催办',
  review: '审核通过',
  followup: '回访记录',
  complete: '办结归档',
};
