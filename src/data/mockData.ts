import Mock from 'mockjs';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);
import type {
  Complaint,
  TimelineRecord,
  DashboardStats,
  ComplaintSource,
  ComplaintStatus,
  TimelineType,
} from '@/types';
import { categories, areas, departments } from './dictionaries';

const Random = Mock.Random;

const complaintTitles = [
  '小区门口占道经营严重，影响通行',
  '道路施工噪音扰民，夜间无法休息',
  '公交站点设置不合理，出行不便',
  '下水道堵塞，污水外溢',
  '路灯损坏，夜间行走不便',
  '小区垃圾清运不及时，异味严重',
  '违章建筑搭建，存在安全隐患',
  '停车位紧张，乱停乱放现象严重',
  '公园设施老化，需要维护',
  '餐饮店油烟污染，影响居民生活',
  '道路坑洼不平，存在安全隐患',
  '井盖缺失，存在安全隐患',
  '楼道堆物，消防通道堵塞',
  '广场舞噪音扰民',
  '流浪猫狗增多，影响环境',
  '共享单车乱停放',
  '绿化维护不到位，杂草丛生',
  '电梯故障频发，出行不便',
  '自来水水质异常',
  '信号灯故障，交通混乱',
];

const generateTimelines = (
  complaintId: string,
  status: ComplaintStatus,
  createdAt: string
): TimelineRecord[] => {
  const timelines: TimelineRecord[] = [];
  let currentTime = dayjs(createdAt);

  timelines.push({
    id: `${complaintId}-t1`,
    complaintId,
    type: 'accept',
    operator: '系统自动受理',
    content: '投诉已受理，等待派单',
    createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
  });

  currentTime = currentTime.add(Random.integer(10, 60), 'minute');
  timelines.push({
    id: `${complaintId}-t2`,
    complaintId,
    type: 'assign',
    operator: '智能派单系统',
    content: '根据区域和分类自动派单至责任单位',
    createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
  });

  if (status === 'processing' || status === 'pending_review' || status === 'completed' || status === 'returned' || status === 'overdue') {
    currentTime = currentTime.add(Random.integer(1, 5), 'hour');
    timelines.push({
      id: `${complaintId}-t3`,
      complaintId,
      type: 'process',
      operator: Random.pick(departments).name + ' 张工',
      content: '已接收工单，正在处理中',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  if (Random.boolean()) {
    currentTime = currentTime.add(Random.integer(5, 20), 'hour');
    timelines.push({
      id: `${complaintId}-t-urge`,
      complaintId,
      type: 'urge',
      operator: '督办员 李督办',
      content: '请加快办理进度，确保按时办结',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  if (status === 'returned') {
    currentTime = currentTime.add(Random.integer(1, 3), 'day');
    timelines.push({
      id: `${complaintId}-t4`,
      complaintId,
      type: 'process',
      operator: Random.pick(departments).name + ' 王工',
      content: '已完成办理，提交办理结果',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
    currentTime = currentTime.add(Random.integer(2, 8), 'hour');
    timelines.push({
      id: `${complaintId}-t5`,
      complaintId,
      type: 'return',
      operator: '督办员 李督办',
      content: '办理结果不详细，请补充现场照片和具体处理措施',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  if (status === 'pending_review' || status === 'completed') {
    currentTime = currentTime.add(Random.integer(2, 6), 'day');
    timelines.push({
      id: `${complaintId}-t6`,
      complaintId,
      type: 'process',
      operator: Random.pick(departments).name + ' 赵工',
      content: '办理完成，已清理占道经营，依法处罚相关商户',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  if (status === 'completed') {
    currentTime = currentTime.add(Random.integer(1, 2), 'day');
    timelines.push({
      id: `${complaintId}-t7`,
      complaintId,
      type: 'review',
      operator: '督办员 李督办',
      content: '审核通过，办理结果符合要求',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
    currentTime = currentTime.add(Random.integer(12, 24), 'hour');
    timelines.push({
      id: `${complaintId}-t8`,
      complaintId,
      type: 'complete',
      operator: '系统',
      content: '投诉已办结归档',
      createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    });
  }

  return timelines.sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());
};

const generateComplaint = (index: number): Complaint => {
  const sources: ComplaintSource[] = ['web', 'hotline', 'backend'];
  const statuses: ComplaintStatus[] = [
    'pending_accept',
    'pending_assign',
    'processing',
    'pending_review',
    'returned',
    'completed',
    'overdue',
  ];

  const source = Random.pick(sources);
  const statusIndex = Random.integer(0, 6);
  const status = statuses[statusIndex];
  const subCategories = categories.filter(c => c.parentId);
  const category = Random.pick(subCategories);
  const parentCategory = categories.find(c => c.id === category.parentId);
  const area = Random.pick(areas);
  const department = Random.pick(departments);

  const createdAt = dayjs()
    .subtract(Random.integer(0, 29), 'day')
    .subtract(Random.integer(0, 23), 'hour')
    .subtract(Random.integer(0, 59), 'minute')
    .format('YYYY-MM-DD HH:mm:ss');

  const deadline = dayjs(createdAt)
    .add(Random.integer(3, 7), 'day')
    .format('YYYY-MM-DD HH:mm:ss');

  let finishedAt: string | undefined;
  let satisfaction: number | undefined;

  if (status === 'completed') {
    finishedAt = dayjs(createdAt)
      .add(Random.integer(2, 5), 'day')
      .format('YYYY-MM-DD HH:mm:ss');
    satisfaction = Random.integer(3, 5);
  }

  const timelines = generateTimelines(`C${String(index + 1).padStart(5, '0')}`, status, createdAt);

  return {
    id: `C${String(index + 1).padStart(5, '0')}`,
    title: complaintTitles[index % complaintTitles.length],
    content: Random.cparagraph(2, 4),
    source,
    status,
    categoryId: category.id,
    categoryName: `${parentCategory?.name || ''} - ${category.name}`,
    areaId: area.id,
    areaName: area.name,
    departmentId: department.id,
    departmentName: department.name,
    createdAt,
    deadline,
    finishedAt,
    contactName: Random.cname(),
    contactPhone: /^1[3-9]\d{9}$/.exec(Random.string('number', 11))?.[0] || '13800138000',
    address: area.name + Random.csentence(5, 10),
    satisfaction,
    isRepeat: Random.boolean(0.15),
    urgeCount: Random.integer(0, 3),
    timelines,
  };
};

export const generateComplaints = (count: number = 60): Complaint[] => {
  const complaints: Complaint[] = [];
  for (let i = 0; i < count; i++) {
    complaints.push(generateComplaint(i));
  }
  return complaints;
};

export const generateDashboardStats = (complaints: Complaint[]): DashboardStats => {
  const totalCount = complaints.length;
  const processingCount = complaints.filter(c => c.status === 'processing' || c.status === 'pending_review').length;
  const completedCount = complaints.filter(c => c.status === 'completed').length;
  const overdueCount = complaints.filter(c => c.status === 'overdue').length;

  const completedComplaints = complaints.filter(c => c.status === 'completed' && c.satisfaction);
  const satisfaction = completedComplaints.length > 0
    ? completedComplaints.reduce((sum, c) => sum + (c.satisfaction || 0), 0) / completedComplaints.length
    : 0;

  const avgProcessDays = completedComplaints.length > 0
    ? completedComplaints.reduce((sum, c) => {
        const days = dayjs(c.finishedAt!).diff(dayjs(c.createdAt), 'day');
        return sum + days;
      }, 0) / completedComplaints.length
    : 0;

  const trendData = [];
  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('MM-DD');
    const dayStart = dayjs().subtract(i, 'day').startOf('day');
    const dayEnd = dayjs().subtract(i, 'day').endOf('day');
    const count = complaints.filter(c => dayjs(c.createdAt).isBetween(dayStart, dayEnd)).length;
    const completed = complaints.filter(
      c => c.finishedAt && dayjs(c.finishedAt).isBetween(dayStart, dayEnd)
    ).length;
    trendData.push({ date, count, completed });
  }

  const categoryMap = new Map<string, number>();
  complaints.forEach(c => {
    const catName = c.categoryName.split(' - ')[0];
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
  });
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

  const sourceMap = new Map<string, number>();
  complaints.forEach(c => {
    const sourceName = c.source === 'web' ? '网页提交' : c.source === 'hotline' ? '热线导入' : '后台录入';
    sourceMap.set(sourceName, (sourceMap.get(sourceName) || 0) + 1);
  });
  const sourceData = Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }));

  const areaMap = new Map<string, number>();
  complaints.forEach(c => {
    areaMap.set(c.areaName, (areaMap.get(c.areaName) || 0) + 1);
  });
  const areaRank = Array.from(areaMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const repeatComplaints = complaints.filter(c => c.isRepeat);
  const repeatTop = repeatComplaints.slice(0, 5).map(c => ({
    title: c.title,
    count: Random.integer(2, 5),
    area: c.areaName,
  }));

  return {
    totalCount,
    processingCount,
    completedCount,
    overdueCount,
    satisfaction: Number(satisfaction.toFixed(1)),
    avgProcessDays: Number(avgProcessDays.toFixed(1)),
    trendData,
    categoryData,
    sourceData,
    areaRank,
    repeatTop,
  };
};
