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
  ExtensionRequest,
  Notification,
  KnowledgeEntry,
  DispatchRule,
  RiskRule,
  WarningAlert,
  RiskRuleType,
  RiskLevel,
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
  createdAt: string,
  departmentName: string,
  assignSource: 'auto' | 'manual' = 'auto'
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
    operator: assignSource === 'auto' ? '智能派单系统' : '人工派单',
    content: assignSource === 'auto'
      ? `根据区域和分类自动派单至${departmentName}`
      : `人工派单至${departmentName}`,
    createdAt: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    assignSource,
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
      type: 'reply',
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
      type: 'reply',
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

  const assignSource: 'auto' | 'manual' = Random.boolean(0.85) ? 'auto' : 'manual';
  const dispatchRuleId = assignSource === 'auto' ? `DR${String(Random.integer(1, 24)).padStart(4, '0')}` : undefined;
  const dispatchRuleName = dispatchRuleId ? `${area.name}${category.name}派单规则` : undefined;

  const timelines = generateTimelines(
    `C${String(index + 1).padStart(5, '0')}`,
    status,
    createdAt,
    department.name,
    assignSource
  );

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
    assignSource,
    dispatchRuleId,
    dispatchRuleName,
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

export const generateExtensionRequests = (complaints: Complaint[]): ExtensionRequest[] => {
  const processingComplaints = complaints.filter(
    (c) => c.status === 'processing' || c.status === 'returned'
  );
  const requests: ExtensionRequest[] = [];
  const count = Math.min(8, Math.floor(processingComplaints.length * 0.4));

  for (let i = 0; i < count; i++) {
    const complaint = processingComplaints[i];
    if (!complaint) continue;

    const statuses: ('pending' | 'approved' | 'rejected')[] = ['pending', 'pending', 'approved', 'rejected'];
    const status = statuses[Random.integer(0, 3)];
    const days = [3, 5, 7, 10, 15][Random.integer(0, 4)];
    const createdAt = dayjs(complaint.createdAt)
      .add(Random.integer(1, 3), 'day')
      .format('YYYY-MM-DD HH:mm:ss');

    const request: ExtensionRequest = {
      id: `EXT${String(i + 1).padStart(4, '0')}`,
      complaintId: complaint.id,
      complaintTitle: complaint.title,
      departmentName: complaint.departmentName,
      days,
      reason: Random.pick([
        '问题涉及多部门协调，需更多时间沟通',
        '现场情况复杂，需进一步勘察核实',
        '受天气影响，施工进度延迟',
        '需上级部门审批，流程较长',
        '当事人配合度低，需多次沟通',
      ]),
      status,
      createdAt,
    };

    if (status !== 'pending') {
      request.approvedAt = dayjs(createdAt)
        .add(Random.integer(2, 12), 'hour')
        .format('YYYY-MM-DD HH:mm:ss');
      request.approver = '督办员 李督办';
      request.approveRemark = Random.pick([
        '同意延期，请尽快办理',
        '情况属实，同意延期',
        '请加快进度，下不为例',
      ]);
    }

    requests.push(request);
  }

  return requests.sort((a, b) =>
    dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
  );
};

export const generateNotifications = (
  complaints: Complaint[],
  extensionRequests: ExtensionRequest[]
): Notification[] => {
  const notifications: Notification[] = [];
  let idCounter = 1;

  complaints.forEach((complaint) => {
    complaint.timelines.forEach((timeline) => {
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
          content = `投诉「${complaint.title}」已被退回重办，原因：${timeline.content.replace('退回重办，原因：', '')}`;
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
        const extRequest = extensionRequests.find(
          (r) => r.complaintId === complaint.id && (type === 'delay_approve' || type === 'delay_reject')
        );

        notifications.push({
          id: `NOTIF${String(idCounter++).padStart(5, '0')}`,
          type,
          title,
          content,
          complaintId: complaint.id,
          extensionRequestId: extRequest?.id,
          isRead: dayjs(timeline.createdAt).isBefore(dayjs().subtract(3, 'day')),
          createdAt: timeline.createdAt,
        });
      }
    });
  });

  extensionRequests.forEach((request) => {
    const complaint = complaints.find((c) => c.id === request.complaintId);
    if (!complaint) return;

    notifications.push({
      id: `NOTIF${String(idCounter++).padStart(5, '0')}`,
      type: 'delay_request',
      title: '延期申请待审批',
      content: `${request.departmentName} 提交了投诉「${complaint.title}」的延期申请，申请延期 ${request.days} 天`,
      complaintId: request.complaintId,
      extensionRequestId: request.id,
      isRead: request.status !== 'pending' || dayjs(request.createdAt).isBefore(dayjs().subtract(2, 'day')),
      createdAt: request.createdAt,
    });
  });

  const recentComplaints = complaints
    .filter((c) => dayjs(c.createdAt).isAfter(dayjs().subtract(7, 'day')))
    .slice(0, 5);

  recentComplaints.forEach((complaint) => {
    notifications.push({
      id: `NOTIF${String(idCounter++).padStart(5, '0')}`,
      type: 'new_complaint',
      title: '新投诉提醒',
      content: `收到新投诉「${complaint.title}」，来自${complaint.areaName}`,
      complaintId: complaint.id,
      isRead: dayjs(complaint.createdAt).isBefore(dayjs().subtract(1, 'day')),
      createdAt: complaint.createdAt,
    });
  });

  return notifications.sort(
    (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
  );
};

const knowledgeTemplates = [
  {
    title: '占道经营投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的占道经营问题，我们已安排执法人员前往现场进行整治。具体处理措施如下：\n1. 对占道经营商户进行宣传教育，告知相关法律法规；\n2. 对拒不整改的商户依法暂扣经营物品并予以处罚；\n3. 建立长效巡查机制，加大该区域巡查频次。\n感谢您对城市管理工作的监督与支持！',
    category: 'c1-3',
    dept: 'd1',
    keywords: ['占道经营', '摆摊', '市容', '整治'],
  },
  {
    title: '噪音污染投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的噪音扰民问题，我们已安排工作人员现场核查处理。具体情况如下：\n1. 已对噪音源单位下达整改通知书，责令采取降噪措施；\n2. 要求施工单位严格遵守施工作业时间，禁止夜间违规施工；\n3. 后续将加强巡查，确保整改措施落实到位。\n如仍有问题，欢迎您继续监督反馈！',
    category: 'c3-1',
    dept: 'd3',
    keywords: ['噪音', '扰民', '施工', '降噪'],
  },
  {
    title: '垃圾清运投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的垃圾清运不及时问题，我们已协调环卫部门进行处理。具体措施如下：\n1. 立即安排清运车辆对积压垃圾进行清理；\n2. 优化清运路线和频次，确保垃圾日产日清；\n3. 加强对清运公司的考核管理，提升服务质量。\n感谢您的反馈，我们将持续改进环境卫生工作！',
    category: 'c1-1',
    dept: 'd1',
    keywords: ['垃圾', '清运', '环卫', '清洁'],
  },
  {
    title: '违章建筑投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的违章建筑问题，我们已立案调查。处理流程如下：\n1. 执法人员已现场勘查取证，确认违建事实；\n2. 已向当事人下达限期拆除通知书，责令自行拆除；\n3. 逾期未拆除的，将依法启动强制拆除程序。\n我们将依法依规推进处置工作，感谢您的监督！',
    category: 'c1-2',
    dept: 'd4',
    keywords: ['违建', '违章建筑', '拆除', '违法建设'],
  },
  {
    title: '道路坑洼投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的道路坑洼问题，我们已安排市政养护部门处理。具体情况如下：\n1. 已对坑洼路段进行临时修补，保障通行安全；\n2. 将该路段纳入年度道路维修计划，进行全面整修；\n3. 加强日常巡查，及时发现处置道路病害。\n感谢您对市政设施的关注与建议！',
    category: 'c4-2',
    dept: 'd4',
    keywords: ['道路', '坑洼', '市政', '养护'],
  },
  {
    title: '路灯损坏投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的路灯损坏问题，我们已安排维修人员处理。具体如下：\n1. 已派出现场维修人员进行故障排查；\n2. 一般故障将在24小时内修复，涉及线路改造的3个工作日内完成；\n3. 建立路灯巡检机制，定期排查安全隐患。\n感谢您的反馈，祝您出行安全！',
    category: 'c4-2',
    dept: 'd4',
    keywords: ['路灯', '照明', '故障', '维修'],
  },
  {
    title: '下水道堵塞投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的下水道堵塞问题，我们已安排疏通人员前往处理。具体措施如下：\n1. 已派疏通车辆和人员现场清淤疏通；\n2. 对堵塞原因进行排查，如有管网破损将安排修复；\n3. 加强排水管网日常养护，减少堵塞情况发生。\n感谢您的反馈，我们将尽快恢复排水畅通！',
    category: 'c3-3',
    dept: 'd6',
    keywords: ['下水道', '堵塞', '污水', '排水'],
  },
  {
    title: '停车乱停乱放投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的乱停乱放问题，我们已联合交管部门开展整治。具体措施如下：\n1. 加强该路段巡查频次，对违停车辆依法贴单处罚；\n2. 优化周边停车位设置，引导规范停放；\n3. 宣传文明停车理念，提升车主规范意识。\n感谢您对交通管理工作的支持！',
    category: 'c2-3',
    dept: 'd8',
    keywords: ['停车', '乱停', '违停', '交通'],
  },
  {
    title: '油烟污染投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的餐饮油烟污染问题，我们已联合市场监管部门现场检查。处理情况如下：\n1. 已要求餐饮店安装并正常使用油烟净化设备；\n2. 责令定期清洗维护，确保达标排放；\n3. 对整改不到位的，依法予以处罚。\n感谢您对环境保护工作的监督！',
    category: 'c3-2',
    dept: 'd7',
    keywords: ['油烟', '餐饮', '污染', '净化'],
  },
  {
    title: '小区物业投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的小区物业管理问题，我们已约谈物业企业负责人。具体处理如下：\n1. 要求物业限期整改存在的问题，提升服务质量；\n2. 指导小区业主委员会依法履行监督职责；\n3. 将物业企业整改情况纳入信用考核。\n如问题仍未解决，建议通过业主大会更换物业企业。感谢您的反馈！',
    category: 'c5-1',
    dept: 'd4',
    keywords: ['物业', '小区', '服务', '管理'],
  },
  {
    title: '广场舞噪音投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的广场舞噪音扰民问题，我们已协调相关部门处理。具体措施如下：\n1. 已对广场舞活动组织者进行宣传劝导，要求控制音量和活动时间；\n2. 明确活动时段（早7:00后、晚21:00前），音量不得超过规定标准；\n3. 安排人员现场巡查，对违规行为及时劝阻。\n感谢您的理解与监督，我们将持续关注！',
    category: 'c3-1',
    dept: 'd3',
    keywords: ['广场舞', '噪音', '扰民', '劝导'],
  },
  {
    title: '流浪动物投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的流浪动物问题，我们已协调相关部门处理。具体措施如下：\n1. 已联系动物救助机构对流浪动物进行捕捉收容；\n2. 加强对流浪动物聚集区域的巡查管理；\n3. 宣传文明养宠理念，减少弃养行为。\n感谢您的关注与建议！',
    category: 'c1-1',
    dept: 'd1',
    keywords: ['流浪狗', '流浪猫', '动物', '收容'],
  },
  {
    title: '公交站点设置投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的公交站点设置问题，我们已进行现场勘查和调研。具体情况如下：\n1. 已收集您的建议，将纳入公交线网优化方案统筹考虑；\n2. 公交站点设置需综合考虑客流、道路条件、安全等多方面因素；\n3. 如具备调整条件，将在下次线网优化时予以调整。\n感谢您对公共交通的关注与建议！',
    category: 'c2-2',
    dept: 'd2',
    keywords: ['公交', '站点', '出行', '线网'],
  },
  {
    title: '绿化维护投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的绿化维护问题，我们已安排园林部门处理。具体措施如下：\n1. 已对该区域绿化进行修剪、除草、补植等养护作业；\n2. 加强日常巡查，及时发现处置绿化问题；\n3. 提升绿化养护标准，打造优美城市环境。\n感谢您对园林绿化工作的关心与支持！',
    category: 'c4-3',
    dept: 'd5',
    keywords: ['绿化', '园林', '养护', '植被'],
  },
  {
    title: '电梯故障投诉处理口径',
    content: '尊敬的市民，您好！关于您反映的电梯故障问题，我们已督促物业和维保单位处理。具体情况如下：\n1. 已要求电梯维保单位立即排查故障原因并修复；\n2. 督促物业加强电梯日常管理，定期维护保养；\n3. 如存在安全隐患，将依法依规进行查处。\n感谢您的反馈，祝您生活愉快！',
    category: 'c5-2',
    dept: 'd4',
    keywords: ['电梯', '故障', '维保', '安全'],
  },
];

export const generateKnowledgeEntries = (): KnowledgeEntry[] => {
  const subCategories = categories.filter(c => c.parentId);
  
  return knowledgeTemplates.map((template, index) => {
    const category = subCategories.find(c => c.id === template.category) || subCategories[index % subCategories.length];
    const parentCategory = categories.find(c => c.id === category.parentId);
    const department = departments.find(d => d.id === template.dept) || departments[index % departments.length];
    
    const createdAt = dayjs()
      .subtract(Random.integer(30, 180), 'day')
      .format('YYYY-MM-DD HH:mm:ss');
    const updatedAt = dayjs(createdAt)
      .add(Random.integer(1, 30), 'day')
      .format('YYYY-MM-DD HH:mm:ss');
    
    return {
      id: `KB${String(index + 1).padStart(4, '0')}`,
      title: template.title,
      content: template.content,
      categoryId: category.id,
      categoryName: `${parentCategory?.name || ''} - ${category.name}`,
      departmentId: department.id,
      departmentName: department.name,
      keywords: template.keywords,
      status: Random.boolean(0.85) ? 'active' : 'disabled',
      createdAt,
      updatedAt,
      creator: Random.pick(['管理员', '李督办', '王主管', '张工']),
      usageCount: Random.integer(0, 50),
    };
  });
};

const dispatchRuleTemplates = [
  { category: 'c1-1', area: 'a1', dept: 'd1', priority: 100, name: '东城区市容环境派单规则' },
  { category: 'c1-1', area: 'a2', dept: 'd1', priority: 90, name: '西城区市容环境派单规则' },
  { category: 'c1-1', area: 'a3', dept: 'd1', priority: 80, name: '朝阳区市容环境派单规则' },
  { category: 'c1-2', area: 'a1', dept: 'd14', priority: 95, name: '东城区违章建筑派单规则' },
  { category: 'c1-2', area: 'a3', dept: 'd14', priority: 85, name: '朝阳区违章建筑派单规则' },
  { category: 'c1-3', area: 'a1', dept: 'd1', priority: 90, name: '东城区占道经营派单规则' },
  { category: 'c1-3', area: 'a3', dept: 'd1', priority: 80, name: '朝阳区占道经营派单规则' },
  { category: 'c2-1', area: 'a1', dept: 'd2', priority: 100, name: '东城区道路交通派单规则' },
  { category: 'c2-1', area: 'a4', dept: 'd2', priority: 90, name: '海淀区道路交通派单规则' },
  { category: 'c2-3', area: 'a3', dept: 'd8', priority: 95, name: '朝阳区停车管理派单规则' },
  { category: 'c2-3', area: 'a1', dept: 'd8', priority: 85, name: '东城区停车管理派单规则' },
  { category: 'c3-1', area: 'a3', dept: 'd3', priority: 100, name: '朝阳区噪音污染派单规则' },
  { category: 'c3-1', area: 'a1', dept: 'd3', priority: 90, name: '东城区噪音污染派单规则' },
  { category: 'c3-2', area: 'a3', dept: 'd3', priority: 95, name: '朝阳区大气污染派单规则' },
  { category: 'c3-3', area: 'a6', dept: 'd6', priority: 100, name: '石景山区水污染派单规则' },
  { category: 'c3-3', area: 'a5', dept: 'd6', priority: 90, name: '丰台区水污染派单规则' },
  { category: 'c4-2', area: 'a2', dept: 'd4', priority: 90, name: '西城区道路养护派单规则' },
  { category: 'c4-2', area: 'a4', dept: 'd4', priority: 85, name: '海淀区道路养护派单规则' },
  { category: 'c4-3', area: 'a5', dept: 'd5', priority: 100, name: '丰台区园林绿化派单规则' },
  { category: 'c4-3', area: 'a6', dept: 'd5', priority: 90, name: '石景山区园林绿化派单规则' },
  { category: 'c5-1', area: 'a3', dept: 'd4', priority: 95, name: '朝阳区物业管理派单规则' },
  { category: 'c5-1', area: 'a4', dept: 'd4', priority: 85, name: '海淀区物业管理派单规则' },
  { category: 'c5-2', area: 'a1', dept: 'd4', priority: 90, name: '东城区房屋质量派单规则' },
  { category: 'c5-2', area: 'a2', dept: 'd4', priority: 80, name: '西城区房屋质量派单规则' },
];

export const generateDispatchRules = (): DispatchRule[] => {
  return dispatchRuleTemplates.map((template, index) => {
    const category = categories.find(c => c.id === template.category);
    const parentCategory = categories.find(c => c.id === category?.parentId);
    const area = areas.find(a => a.id === template.area);
    const department = departments.find(d => d.id === template.dept);

    const createdAt = dayjs()
      .subtract(Random.integer(30, 180), 'day')
      .format('YYYY-MM-DD HH:mm:ss');
    const updatedAt = dayjs(createdAt)
      .add(Random.integer(1, 30), 'day')
      .format('YYYY-MM-DD HH:mm:ss');

    return {
      id: `DR${String(index + 1).padStart(4, '0')}`,
      name: template.name,
      categoryId: template.category,
      categoryName: `${parentCategory?.name || ''} - ${category?.name || ''}`,
      areaId: template.area,
      areaName: area?.name || '',
      departmentId: template.dept || '',
      departmentName: department?.name || '',
      priority: template.priority,
      enabled: Random.boolean(0.9),
      description: `根据${area?.name || ''}区域和${parentCategory?.name || ''}-${category?.name || ''}分类自动派单至${department?.name || ''}`,
      createdAt,
      updatedAt,
    };
  });
};

const riskRuleTemplates: {
  type: RiskRuleType;
  name: string;
  description: string;
  priority: number;
  threshold: RiskRule['threshold'];
}[] = [
  {
    type: 'expiring',
    name: '临期预警',
    description: '距离办理时限不足指定天数的工单自动预警',
    priority: 80,
    threshold: { daysLeft: 2 },
  },
  {
    type: 'overdue',
    name: '超期预警',
    description: '已超过办理时限仍未办结的工单自动预警',
    priority: 100,
    threshold: {},
  },
  {
    type: 'multi_urge',
    name: '多次催办预警',
    description: '被催办次数达到阈值的工单自动预警',
    priority: 90,
    threshold: { urgeCount: 2 },
  },
  {
    type: 'repeat_cluster',
    name: '重复投诉聚集预警',
    description: '同一区域或同一问题在指定时间内重复投诉达到阈值',
    priority: 85,
    threshold: { repeatCount: 3, repeatDays: 7 },
  },
  {
    type: 'low_satisfaction',
    name: '低满意度预警',
    description: '已办结工单满意度低于阈值时自动预警',
    priority: 70,
    threshold: { satisfactionBelow: 3 },
  },
];

export const generateRiskRules = (): RiskRule[] => {
  return riskRuleTemplates.map((template, index) => {
    const createdAt = dayjs()
      .subtract(Random.integer(30, 90), 'day')
      .format('YYYY-MM-DD HH:mm:ss');
    const updatedAt = dayjs(createdAt)
      .add(Random.integer(1, 15), 'day')
      .format('YYYY-MM-DD HH:mm:ss');

    return {
      id: `RR${String(index + 1).padStart(4, '0')}`,
      name: template.name,
      type: template.type,
      description: template.description,
      enabled: true,
      priority: template.priority,
      threshold: { ...template.threshold },
      scope: { type: 'all' },
      createdAt,
      updatedAt,
      creator: '系统管理员',
    };
  });
};

const getRiskLevel = (complaint: Complaint, ruleType: RiskRuleType): RiskLevel => {
  const daysLeft = dayjs(complaint.deadline).diff(dayjs(), 'day');
  const urgeCount = complaint.urgeCount || 0;

  if (ruleType === 'overdue' || urgeCount >= 3 || daysLeft < 0) {
    return 'high';
  }
  if (ruleType === 'expiring' && daysLeft <= 1) {
    return 'medium';
  }
  if (urgeCount >= 2) {
    return 'medium';
  }
  return 'low';
};

const countRecentRepeats = (
  complaint: Complaint,
  allComplaints: Complaint[],
  windowDays: number
): number => {
  if (!complaint.isRepeat || !complaint.repeatGroupId) return 1;
  const groupComplaints = allComplaints.filter(
    (c) => c.repeatGroupId === complaint.repeatGroupId
  );
  const windowStart = dayjs().subtract(windowDays, 'day');
  return groupComplaints.filter((c) => dayjs(c.createdAt).isAfter(windowStart)).length;
};

export const generateWarningAlerts = (
  complaints: Complaint[],
  rules: RiskRule[]
): WarningAlert[] => {
  const alerts: WarningAlert[] = [];
  let alertIdCounter = 1;

  const enabledRules = rules.filter((r) => r.enabled);

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
          if (!c.isRepeat) return false;
          const repeatThreshold = rule.threshold.repeatCount ?? 3;
          const windowDays = rule.threshold.repeatDays ?? 7;
          const recentCount = countRecentRepeats(c, complaints, windowDays);
          return recentCount >= repeatThreshold;
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
      const riskLevel = getRiskLevel(complaint, rule.type);
      const triggeredAt = dayjs()
        .subtract(Random.integer(0, 48), 'hour')
        .subtract(Random.integer(0, 59), 'minute')
        .format('YYYY-MM-DD HH:mm:ss');

      const statuses: WarningAlert['status'][] = ['pending', 'pending', 'pending', 'processing', 'handled'];
      const status = Random.pick(statuses);

      const alert: WarningAlert = {
        id: `WA${String(alertIdCounter++).padStart(5, '0')}`,
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        complaintId: complaint.id,
        complaintTitle: complaint.title,
        riskLevel,
        status,
        triggeredAt,
        detail: {},
      };

      if (status === 'handled') {
        alert.handledAt = dayjs(triggeredAt)
          .add(Random.integer(1, 24), 'hour')
          .format('YYYY-MM-DD HH:mm:ss');
        alert.handler = Random.pick(['督办员 李督办', '主管 王主管', '管理员']);
      }

      alerts.push(alert);
    });
  });

  const uniqueAlerts: WarningAlert[] = [];
  const seenKeys = new Set<string>();

  for (const alert of alerts) {
    const key = `${alert.ruleId}-${alert.complaintId}`;
    if (!seenKeys.has(key) || alert.status === 'pending') {
      if (!seenKeys.has(key)) {
        uniqueAlerts.push(alert);
        seenKeys.add(key);
      }
    }
  }

  return uniqueAlerts.sort(
    (a, b) => dayjs(b.triggeredAt).valueOf() - dayjs(a.triggeredAt).valueOf()
  );
};
