import dayjs from 'dayjs';
import type {
  AssignSource,
  Complaint,
  NotificationType,
  ProcessAction,
  ProcessTraceExport,
  SimulationActionInput,
  SimulationExtensionRequest,
  SimulationNotification,
  SimulationRole,
  SimulationState,
  SimulationStep,
  TimelineType,
} from '@/types';
import { departments, statusMap, timelineTypeMap } from '@/data/dictionaries';

const DEFAULT_DEPARTMENT = departments[0];

const roleNameMap: Record<SimulationRole, string> = {
  supervisor: '督办员',
  operator: '责任单位',
  system: '系统',
};

const notificationTargetMap: Partial<Record<TimelineType, Exclude<SimulationRole, 'system'>>> = {
  urge: 'operator',
  return: 'operator',
  review: 'operator',
  delay_approve: 'operator',
  delay_reject: 'operator',
  delay: 'supervisor',
  reply: 'supervisor',
  assign: 'operator',
  transfer: 'operator',
  accept: 'supervisor',
};

const notificationTypeByTimeline: Partial<Record<TimelineType, NotificationType>> = {
  urge: 'urge',
  return: 'return',
  review: 'review_pass',
  delay_approve: 'delay_approve',
  delay_reject: 'delay_reject',
  delay: 'delay_request',
  reply: 'review_pass',
  assign: 'new_complaint',
  transfer: 'new_complaint',
  accept: 'new_complaint',
};

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildNotificationText = (
  state: SimulationState,
  type: NotificationType,
  timelineType: TimelineType,
  extensionRequest?: SimulationExtensionRequest
) => {
  switch (timelineType) {
    case 'urge':
      return {
        title: '催办通知',
        content: `投诉「${state.complaintTitle}」已被催办，请加快办理进度`,
      };
    case 'return':
      return {
        title: '退回重办',
        content: `投诉「${state.complaintTitle}」已被退回重办`,
      };
    case 'review':
      return {
        title: '审核通过',
        content: `投诉「${state.complaintTitle}」审核通过，已办结归档`,
      };
    case 'delay_approve':
      return {
        title: '延期申请通过',
        content: `投诉「${state.complaintTitle}」的延期申请已通过`,
      };
    case 'delay_reject':
      return {
        title: '延期申请驳回',
        content: `投诉「${state.complaintTitle}」的延期申请已被驳回`,
      };
    case 'delay':
      return {
        title: '延期申请待审批',
        content: `${state.departmentName} 提交了投诉「${state.complaintTitle}」的延期申请，申请延期 ${extensionRequest?.days || 0} 天`,
      };
    case 'reply':
      return {
        title: '办理结果待审核',
        content: `投诉「${state.complaintTitle}」已提交办理结果，请及时审核`,
      };
    case 'assign':
      return {
        title: '新工单待办理',
        content: `投诉「${state.complaintTitle}」已派单至${state.departmentName}`,
      };
    case 'transfer':
      return {
        title: '新转办工单',
        content: `投诉「${state.complaintTitle}」已转办至${state.departmentName}`,
      };
    case 'accept':
      return {
        title: '新投诉已受理',
        content: `投诉「${state.complaintTitle}」已受理，等待派单`,
      };
    default:
      return {
        title: type,
        content: `投诉「${state.complaintTitle}」有新的流程变更`,
      };
  }
};

const buildNotification = (
  state: SimulationState,
  timelineType: TimelineType,
  extensionRequest?: SimulationExtensionRequest
): SimulationNotification | null => {
  const type = notificationTypeByTimeline[timelineType];
  const targetRole = notificationTargetMap[timelineType];
  if (!type || !targetRole) return null;

  const text = buildNotificationText(state, type, timelineType, extensionRequest);
  return {
    id: makeId('sim-notice'),
    type,
    title: text.title,
    content: text.content,
    targetRole,
    complaintId: state.complaintId,
    extensionRequestId: extensionRequest?.id,
    isRead: false,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
};

const getPendingExtension = (state: SimulationState) =>
  state.extensionRequests.find((request) => request.status === 'pending');

const buildActionContent = (
  action: ProcessAction,
  state: SimulationState,
  input: SimulationActionInput,
  nextDepartmentName?: string,
  extensionRequest?: SimulationExtensionRequest
) => {
  const content = input.content?.trim();
  const reason = input.reason?.trim() || content || action.description;

  switch (action.type) {
    case 'accept':
      return '您的投诉已成功提交，系统已自动受理';
    case 'assign':
      if ((input.assignSource || 'manual') === 'auto' && input.dispatchRuleName) {
        return `根据派单规则「${input.dispatchRuleName}」自动派单至${nextDepartmentName || state.departmentName}`;
      }
      return content || `派单至${nextDepartmentName || state.departmentName}`;
    case 'transfer':
      return `转办至 ${nextDepartmentName || state.departmentName}，原因：${reason}`;
    case 'return':
    case 'review_reject':
      return `退回重办，原因：${reason}`;
    case 'delay_request':
      return `申请延期 ${input.days || 3} 天，原因：${reason}`;
    case 'delay_approve':
      return `延期申请已通过，延长 ${extensionRequest?.days || input.days || 0} 天${content ? `，原因：${content}` : ''}`;
    case 'delay_reject':
      return `延期申请已驳回${content ? `，原因：${content}` : ''}`;
    case 'urge':
      return `督办催办：${content || '请加快办理进度'}`;
    case 'review_pass':
      return `审核通过，评价：${content || '办理合格'}`;
    default:
      return content || action.description;
  }
};

export const createQuickSimulation = (role: SimulationRole = 'supervisor'): SimulationState => {
  const now = dayjs();
  const department = DEFAULT_DEPARTMENT;

  return {
    complaintId: `SIM-${Date.now().toString().slice(-6)}`,
    complaintTitle: '模拟投诉 - 占道经营整治',
    complaintContent: '商户长期占用人行道经营，影响市民通行，需要责任单位现场处置。',
    currentStatus: 'pending_accept',
    history: [],
    startStatus: 'pending_accept',
    startTimestamp: now.format('YYYY-MM-DD HH:mm:ss'),
    currentRole: role,
    source: 'web',
    categoryId: 'c1-3',
    categoryName: '占道经营',
    areaId: 'a1',
    areaName: '东城区',
    departmentId: department.id,
    departmentName: department.name,
    createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    contactName: '模拟市民',
    contactPhone: '13800000000',
    address: '东城区模拟街道',
    urgeCount: 0,
    notifications: [],
    extensionRequests: [],
  };
};

export const createSimulationFromComplaint = (
  complaint: Complaint,
  role: SimulationRole = 'supervisor'
): SimulationState => ({
  complaintId: complaint.id,
  complaintTitle: complaint.title,
  complaintContent: complaint.content,
  currentStatus: complaint.status,
  history: [],
  startStatus: complaint.status,
  startTimestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  currentRole: role,
  source: complaint.source,
  categoryId: complaint.categoryId,
  categoryName: complaint.categoryName,
  areaId: complaint.areaId,
  areaName: complaint.areaName,
  departmentId: complaint.departmentId,
  departmentName: complaint.departmentName,
  createdAt: complaint.createdAt,
  deadline: complaint.deadline,
  finishedAt: complaint.finishedAt,
  contactName: complaint.contactName,
  contactPhone: complaint.contactPhone,
  address: complaint.address,
  urgeCount: complaint.urgeCount || 0,
  notifications: [],
  extensionRequests: [],
  assignSource: complaint.assignSource,
  dispatchRuleName: complaint.dispatchRuleName,
  satisfaction: complaint.satisfaction,
});

export const switchSimulationRole = (
  state: SimulationState,
  role: SimulationRole
): SimulationState => ({
  ...state,
  currentRole: role,
});

export const getAvailableActionsForRole = (
  state: SimulationState,
  actions: ProcessAction[]
) =>
  actions.filter((action) => {
    if (!action.fromStatus.includes(state.currentStatus)) return false;
    if (action.role && action.role !== state.currentRole) return false;
    if (
      (action.type === 'delay_approve' || action.type === 'delay_reject') &&
      !getPendingExtension(state)
    ) {
      return false;
    }
    return true;
  });

export const executeSimulationAction = (
  state: SimulationState,
  action: ProcessAction,
  input: SimulationActionInput = {}
): SimulationState => {
  const now = dayjs();
  const fromStatus = state.currentStatus;
  let nextState: SimulationState = { ...state };
  let nextStatus = action.toStatus || state.currentStatus;
  let nextDepartment = departments.find((dept) => dept.id === input.departmentId);
  let extensionRequest: SimulationExtensionRequest | undefined;
  let deadlineChanged: SimulationStep['deadlineChanged'];
  let departmentChanged: SimulationStep['departmentChanged'];
  let assignSource: AssignSource | undefined;
  let dispatchRuleName: string | undefined;
  let satisfaction: number | undefined;

  if ((action.type === 'assign' || action.type === 'transfer') && !nextDepartment) {
    nextDepartment = departments.find((dept) => dept.id === state.departmentId) || DEFAULT_DEPARTMENT;
  }

  if (action.type === 'assign' || action.type === 'transfer') {
    departmentChanged = {
      fromDepartmentId: state.departmentId,
      fromDepartmentName: state.departmentName,
      toDepartmentId: nextDepartment!.id,
      toDepartmentName: nextDepartment!.name,
    };
    nextState = {
      ...nextState,
      departmentId: nextDepartment!.id,
      departmentName: nextDepartment!.name,
    };
  }

  if (action.type === 'assign') {
    assignSource = input.assignSource || 'manual';
    dispatchRuleName = input.dispatchRuleName;
    nextState.assignSource = assignSource;
    nextState.dispatchRuleName = dispatchRuleName;
  }

  if (action.type === 'delay_request') {
    extensionRequest = {
      id: makeId('sim-ext'),
      complaintId: state.complaintId,
      complaintTitle: state.complaintTitle,
      departmentName: state.departmentName,
      days: input.days || 3,
      reason: input.reason || input.content || '情况复杂，需要延长办理期限',
      status: 'pending',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    };
    nextState.extensionRequests = [extensionRequest, ...state.extensionRequests];
  }

  if (action.type === 'delay_approve' || action.type === 'delay_reject') {
    const pendingRequest = getPendingExtension(state);
    if (!pendingRequest) return state;

    extensionRequest = {
      ...pendingRequest,
      status: action.type === 'delay_approve' ? 'approved' : 'rejected',
      approvedAt: now.format('YYYY-MM-DD HH:mm:ss'),
      approver: roleNameMap.supervisor,
      approveRemark: input.content,
    };
    nextState.extensionRequests = state.extensionRequests.map((request) =>
      request.id === pendingRequest.id ? extensionRequest! : request
    );

    if (action.type === 'delay_approve') {
      const newDeadline = dayjs(state.deadline)
        .add(pendingRequest.days, 'day')
        .format('YYYY-MM-DD HH:mm:ss');
      deadlineChanged = {
        fromDeadline: state.deadline,
        toDeadline: newDeadline,
        days: pendingRequest.days,
      };
      nextState.deadline = newDeadline;
    }
  }

  if (action.type === 'urge') {
    nextState.urgeCount = state.urgeCount + 1;
  }

  if (action.type === 'review_pass') {
    satisfaction = input.satisfaction || 5;
    nextStatus = 'completed';
    nextState.finishedAt = now.format('YYYY-MM-DD HH:mm:ss');
    nextState.satisfaction = satisfaction;
  }

  const timelineType = action.timelineType;
  const stepBase: SimulationStep = {
    id: makeId('sim-step'),
    actionType: action.type,
    actionName: action.name,
    timelineType,
    fromStatus,
    toStatus: nextStatus,
    operator:
      action.type === 'assign' && (input.assignSource || 'manual') === 'auto'
        ? '智能派单系统'
        : action.type === 'assign'
        ? '人工派单'
        : roleNameMap[action.role || state.currentRole],
    operatorRole: action.role || state.currentRole,
    content: buildActionContent(
      action,
      state,
      input,
      nextDepartment?.name,
      extensionRequest || getPendingExtension(state)
    ),
    timestamp: now.format('YYYY-MM-DD HH:mm:ss'),
    departmentChanged,
    deadlineChanged,
    extensionRequestId: extensionRequest?.id,
    assignSource,
    dispatchRuleName,
    satisfaction,
  };

  const noticeBaseState = {
    ...nextState,
    currentStatus: nextStatus,
  };
  const notification = buildNotification(noticeBaseState, timelineType, extensionRequest);
  const notifications = notification ? [notification] : [];

  let steps: SimulationStep[] = [{ ...stepBase, notifications }];

  if (action.type === 'review_pass') {
    const completeStep: SimulationStep = {
      id: makeId('sim-step'),
      actionType: 'complete',
      actionName: '办结归档',
      timelineType: 'complete',
      fromStatus: 'completed',
      toStatus: 'completed',
      operator: '系统',
      operatorRole: 'system',
      content: '投诉已办结归档',
      timestamp: now.add(1, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      isSystemStep: true,
    };
    steps = [...steps, completeStep];
  }

  nextState = {
    ...nextState,
    currentStatus: nextStatus,
    history: [...state.history, ...steps],
    notifications: [...notifications, ...state.notifications],
  };

  return nextState;
};

export const undoLastStep = (state: SimulationState): SimulationState => {
  if (state.history.length === 0) return state;
  const history = [...state.history];
  let lastStep = history.pop()!;

  if (lastStep.isSystemStep && history.length > 0) {
    lastStep = history.pop()!;
  }

  const nextState: SimulationState = {
    ...state,
    currentStatus: lastStep.fromStatus,
    history,
  };

  if (lastStep.departmentChanged) {
    nextState.departmentId = lastStep.departmentChanged.fromDepartmentId;
    nextState.departmentName = lastStep.departmentChanged.fromDepartmentName;
  }

  if (lastStep.deadlineChanged) {
    nextState.deadline = lastStep.deadlineChanged.fromDeadline;
  }

  if (lastStep.actionType === 'urge') {
    nextState.urgeCount = Math.max(0, nextState.urgeCount - 1);
  }

  if (lastStep.actionType === 'review_pass') {
    delete nextState.finishedAt;
    delete nextState.satisfaction;
  }

  if (lastStep.actionType === 'delay_request' && lastStep.extensionRequestId) {
    nextState.extensionRequests = nextState.extensionRequests.filter(
      (request) => request.id !== lastStep.extensionRequestId
    );
  }

  if (
    (lastStep.actionType === 'delay_approve' || lastStep.actionType === 'delay_reject') &&
    lastStep.extensionRequestId
  ) {
    nextState.extensionRequests = nextState.extensionRequests.map((request) =>
      request.id === lastStep.extensionRequestId
        ? {
            ...request,
            status: 'pending',
            approvedAt: undefined,
            approver: undefined,
            approveRemark: undefined,
          }
        : request
    );
  }

  const removedNoticeIds = new Set(lastStep.notifications?.map((notice) => notice.id) || []);
  if (removedNoticeIds.size > 0) {
    nextState.notifications = nextState.notifications.filter(
      (notice) => !removedNoticeIds.has(notice.id)
    );
  }

  return nextState;
};

export const resetSimulation = (state: SimulationState): SimulationState => ({
  ...state,
  currentStatus: state.startStatus,
  history: [],
  notifications: [],
  extensionRequests: [],
  urgeCount: 0,
  finishedAt: undefined,
  satisfaction: undefined,
  deadline: state.deadline,
});

export const exportProcessTrace = (state: SimulationState): ProcessTraceExport => {
  const lines = [
    `流程轨迹导出时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
    `投诉编号：${state.complaintId}`,
    `投诉标题：${state.complaintTitle}`,
    `当前状态：${statusMap[state.currentStatus]}`,
    `责任部门：${state.departmentName}`,
    `截止时间：${state.deadline}`,
    `催办次数：${state.urgeCount}`,
    '',
    '操作轨迹：',
    ...state.history.map((step, index) => {
      const parts = [
        `${index + 1}. [${step.timestamp}] ${step.operator} - ${step.actionName}`,
        `   时间线类型：${timelineTypeMap[step.timelineType] || step.timelineType}`,
        `   状态变化：${statusMap[step.fromStatus]} -> ${statusMap[step.toStatus || step.fromStatus]}`,
        `   内容：${step.content}`,
      ];
      if (step.departmentChanged) {
        parts.push(
          `   部门变化：${step.departmentChanged.fromDepartmentName} -> ${step.departmentChanged.toDepartmentName}`
        );
      }
      if (step.deadlineChanged) {
        parts.push(
          `   截止时间：${step.deadlineChanged.fromDeadline} -> ${step.deadlineChanged.toDeadline}`
        );
      }
      if (step.notifications?.length) {
        parts.push(`   通知：${step.notifications.map((n) => n.title).join('、')}`);
      }
      if (step.satisfaction) {
        parts.push(`   满意度：${step.satisfaction}分`);
      }
      return parts.join('\n');
    }),
    '',
    '延期申请：',
    ...(state.extensionRequests.length
      ? state.extensionRequests.map(
          (request) =>
            `- ${request.createdAt} ${request.departmentName} 申请延期${request.days}天，状态：${request.status}，原因：${request.reason}`
        )
      : ['- 无']),
    '',
    '通知记录：',
    ...(state.notifications.length
      ? state.notifications.map(
          (notice) =>
            `- ${notice.createdAt} [${notice.targetRole === 'supervisor' ? '督办员' : '经办人'}] ${notice.title}：${notice.content}`
        )
      : ['- 无']),
  ];

  return {
    version: '2.0',
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    summary: {
      complaintId: state.complaintId,
      complaintTitle: state.complaintTitle,
      startStatus: state.startStatus,
      currentStatus: state.currentStatus,
      departmentName: state.departmentName,
      deadline: state.deadline,
      finishedAt: state.finishedAt,
      urgeCount: state.urgeCount,
      notificationCount: state.notifications.length,
      extensionRequestCount: state.extensionRequests.length,
      stepCount: state.history.length,
      satisfaction: state.satisfaction,
    },
    steps: state.history,
    notifications: state.notifications,
    extensionRequests: state.extensionRequests,
    timelineText: lines.join('\n'),
  };
};

const downloadBlob = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadTraceAsJson = (state: SimulationState) => {
  const trace = exportProcessTrace(state);
  downloadBlob(
    `${state.complaintId}-process-trace.json`,
    JSON.stringify(trace, null, 2),
    'application/json;charset=utf-8'
  );
};

export const downloadTraceAsText = (state: SimulationState) => {
  const trace = exportProcessTrace(state);
  downloadBlob(
    `${state.complaintId}-process-trace.txt`,
    trace.timelineText,
    'text/plain;charset=utf-8'
  );
};

export const copyTraceToClipboard = async (state: SimulationState) => {
  const trace = exportProcessTrace(state);
  await navigator.clipboard.writeText(trace.timelineText);
};
