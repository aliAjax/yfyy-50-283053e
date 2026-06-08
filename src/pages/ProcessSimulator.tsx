import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Select,
  Input,
  Modal,
  Form,
  Timeline,
  List,
  Badge,
  Divider,
  message,
  Tooltip,
  Switch,
  Tabs,
  Alert,
  Steps,
  Progress,
  Avatar,
} from 'antd';
import {
  Workflow,
  Play,
  RotateCcw,
  ChevronRight,
  Settings,
  Zap,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  Send,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Phone,
  Archive,
  FileCheck,
  StepForward,
  AlertTriangle,
  FastForward,
  Sparkles,
  RefreshCw,
  GitBranch,
  CircleDot,
  Circle,
  Flag,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { StatusTag, SourceTag } from '@/components/StatusTags';
import type {
  ProcessConfig,
  ProcessNode,
  ProcessAction,
  SimulationState,
  SimulationStep,
  Complaint,
} from '@/types';
import {
  defaultProcessConfig,
  getAvailableActions,
  getNodeByStatus,
} from '@/data/processConfig';
import { statusMap, timelineTypeMap, departments, categories } from '@/data/dictionaries';

const { TextArea } = Input;
const { Step } = Steps;

const getActionIcon = (iconName: string, size = 16) => {
  const iconProps = { size };
  switch (iconName) {
    case 'check':
      return <CheckCircle {...iconProps} />;
    case 'send':
      return <Send {...iconProps} />;
    case 'arrow-right':
      return <ArrowRight {...iconProps} />;
    case 'file-check':
      return <FileCheck {...iconProps} />;
    case 'rotate-ccw':
      return <RotateCcw {...iconProps} />;
    case 'clock':
      return <Clock {...iconProps} />;
    case 'thumbs-up':
      return <ThumbsUp {...iconProps} />;
    case 'thumbs-down':
      return <ThumbsDown {...iconProps} />;
    case 'bell':
      return <Bell {...iconProps} />;
    case 'check-circle':
      return <CheckCircle {...iconProps} />;
    case 'x-circle':
      return <XCircle {...iconProps} />;
    case 'phone':
      return <Phone {...iconProps} />;
    case 'archive':
      return <Archive {...iconProps} />;
    default:
      return <Zap {...iconProps} />;
  }
};

const getStatusColor = (color: string) => {
  const colorMap: Record<string, string> = {
    success: '#52c41a',
    processing: '#1890ff',
    warning: '#faad14',
    error: '#ff4d4f',
    default: '#8c8c8c',
  };
  return colorMap[color] || '#8c8c8c';
};

const autoDemoSteps = [
  { action: 'accept', content: '投诉符合受理条件，予以受理' },
  { action: 'assign', content: '根据分类和区域自动派单至城市管理委员会' },
  { action: 'process', content: '已完成现场整治，清理占道经营3处，教育劝导5人' },
  { action: 'review_pass', content: '办理结果符合要求，审核通过' },
  { action: 'followup', content: '电话回访群众，对处理结果表示满意，满意度5星' },
];

const ProcessSimulator: React.FC = () => {
  const { complaints } = useAppStore();
  const [processConfig, setProcessConfig] = useState<ProcessConfig>(defaultProcessConfig);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('');
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState<ProcessAction | null>(null);
  const [editingNode, setEditingNode] = useState<ProcessNode | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const sortedNodes = useMemo(() => {
    return [...processConfig.nodes].sort((a, b) => a.order - b.order);
  }, [processConfig.nodes]);

  const selectedComplaint = useMemo(() => {
    return complaints.find((c) => c.id === selectedComplaintId);
  }, [complaints, selectedComplaintId]);

  const availableActions = useMemo(() => {
    if (!simulation) return [];
    return getAvailableActions(simulation.currentStatus, processConfig.actions);
  }, [simulation, processConfig.actions]);

  const currentNode = useMemo(() => {
    if (!simulation) return null;
    return getNodeByStatus(simulation.currentStatus, processConfig.nodes);
  }, [simulation, processConfig.nodes]);

  const isFinalStatus = useMemo(() => {
    if (!simulation) return false;
    return processConfig.finalStatuses.includes(simulation.currentStatus);
  }, [simulation, processConfig.finalStatuses]);

  const complaintOptions = useMemo(() => {
    return complaints.map((c) => ({
      label: `${c.id} - ${c.title}`,
      value: c.id,
    }));
  }, [complaints]);

  const currentStepIndex = useMemo(() => {
    if (!simulation) return -1;
    const node = getNodeByStatus(simulation.currentStatus, processConfig.nodes);
    return node ? node.order - 1 : -1;
  }, [simulation, processConfig.nodes]);

  const progressPercent = useMemo(() => {
    if (!simulation) return 0;
    const total = sortedNodes.filter((n) => n.status !== 'overdue' && n.status !== 'returned').length;
    const current = currentStepIndex >= 0 ? Math.min(currentStepIndex + 1, total) : 0;
    return Math.round((current / total) * 100);
  }, [simulation, currentStepIndex, sortedNodes]);

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, []);

  const startQuickSimulation = (startStatus: string = 'pending_accept') => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    setSimulation({
      complaintId: 'SIM-' + Date.now().toString().slice(-6),
      complaintTitle: '模拟投诉 - 占道经营整治',
      currentStatus: startStatus as any,
      history: [],
      startStatus: startStatus as any,
      startTimestamp: now,
    });
    setSelectedComplaintId('');
    message.success('已开始新的模拟流程');
  };

  const handleSelectComplaint = (complaintId: string) => {
    const complaint = complaints.find((c) => c.id === complaintId);
    if (!complaint) return;

    const startStatus = complaint.status;
    const startTimestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');

    setSimulation({
      complaintId: complaint.id,
      complaintTitle: complaint.title,
      currentStatus: startStatus,
      history: [],
      startStatus,
      startTimestamp,
    });
    setSelectedComplaintId(complaintId);
    stopAutoPlay();
  };

  const handleActionClick = (action: ProcessAction) => {
    if (action.requiresInput) {
      setCurrentAction(action);
      setActionModalVisible(true);
      form.resetFields();
    } else {
      executeAction(action, '');
    }
  };

  const executeAction = (action: ProcessAction, content: string) => {
    if (!simulation) return;

    const now = dayjs();
    const fromStatus = simulation.currentStatus;

    const operator =
      action.role === 'supervisor'
        ? '督办员'
        : action.role === 'operator'
        ? '责任单位经办人'
        : '系统';

    const step: SimulationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actionType: action.type,
      actionName: action.name,
      fromStatus,
      toStatus: action.toStatus,
      operator,
      content: content || action.description,
      timestamp: now.format('YYYY-MM-DD HH:mm:ss'),
    };

    setSimulation({
      ...simulation,
      currentStatus: action.toStatus || simulation.currentStatus,
      history: [...simulation.history, step],
    });
  };

  const handleActionSubmit = (values: { content: string }) => {
    if (currentAction) {
      executeAction(currentAction, values.content);
    }
    setActionModalVisible(false);
    setCurrentAction(null);
    form.resetFields();
  };

  const handleResetSimulation = () => {
    if (selectedComplaint) {
      setSimulation({
        complaintId: selectedComplaint.id,
        complaintTitle: selectedComplaint.title,
        currentStatus: selectedComplaint.status,
        history: [],
        startStatus: selectedComplaint.status,
        startTimestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
    } else if (simulation) {
      startQuickSimulation('pending_accept');
    }
    stopAutoPlay();
    message.success('已重置模拟状态');
  };

  const handleUndo = () => {
    if (!simulation || simulation.history.length === 0) return;
    const newHistory = [...simulation.history];
    const lastStep = newHistory.pop()!;
    setSimulation({
      ...simulation,
      currentStatus: lastStep.fromStatus,
      history: newHistory,
    });
    stopAutoPlay();
    message.info(`已撤销「${lastStep.actionName}」操作`);
  };

  const handleEditNode = (node: ProcessNode) => {
    setEditingNode(node);
    editForm.setFieldsValue({
      name: node.name,
      description: node.description,
      allowedActions: node.allowedActions,
    });
    setEditModalVisible(true);
  };

  const handleSaveNode = (values: { name: string; description: string; allowedActions: string[] }) => {
    if (!editingNode) return;

    const updatedNodes = processConfig.nodes.map((n) =>
      n.id === editingNode.id
        ? { ...n, name: values.name, description: values.description, allowedActions: values.allowedActions as any }
        : n
    );

    setProcessConfig({
      ...processConfig,
      nodes: updatedNodes,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    message.success('节点配置已更新');
    setEditModalVisible(false);
    setEditingNode(null);
  };

  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const startAutoDemo = () => {
    startQuickSimulation('pending_accept');
    setTimeout(() => {
      setIsAutoPlaying(true);
      runAutoStep(0);
    }, 300);
  };

  const runAutoStep = (stepIndex: number) => {
    if (stepIndex >= autoDemoSteps.length) {
      setIsAutoPlaying(false);
      message.success('自动演示完成');
      return;
    }

    const stepData = autoDemoSteps[stepIndex];
    const action = processConfig.actions.find((a) => a.type === stepData.action);

    if (!action) {
      runAutoStep(stepIndex + 1);
      return;
    }

    setSimulation((prev) => {
      if (!prev) return prev;

      const now = dayjs();
      const fromStatus = prev.currentStatus;

      const operator =
        action.role === 'supervisor'
          ? '督办员'
          : action.role === 'operator'
          ? '责任单位经办人'
          : '系统';

      const step: SimulationStep = {
        id: `step-auto-${Date.now()}-${stepIndex}`,
        actionType: action.type,
        actionName: action.name,
        fromStatus,
        toStatus: action.toStatus,
        operator,
        content: stepData.content,
        timestamp: now.format('YYYY-MM-DD HH:mm:ss'),
      };

      return {
        ...prev,
        currentStatus: action.toStatus || prev.currentStatus,
        history: [...prev.history, step],
      };
    });

    autoPlayRef.current = setTimeout(() => {
      runAutoStep(stepIndex + 1);
    }, 1200);
  };

  const getTimelineColor = (step: SimulationStep) => {
    const colorMap: Record<string, string> = {
      accept: 'blue',
      assign: 'blue',
      transfer: 'purple',
      process: 'cyan',
      return: 'red',
      delay: 'orange',
      delay_approve: 'green',
      delay_reject: 'red',
      urge: 'orange',
      review: 'green',
      followup: 'blue',
      complete: 'green',
      review_pass: 'green',
      review_reject: 'red',
      delay_request: 'orange',
    };
    return colorMap[step.actionType] || 'gray';
  };

  const getTimelineDot = (step: SimulationStep) => {
    const action = processConfig.actions.find((a) => a.type === step.actionType);
    if (!action) return undefined;
    return getActionIcon(action.icon, 12);
  };

  const mainFlowNodes = sortedNodes.filter(
    (n) => n.status !== 'overdue' && n.status !== 'returned'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <GitBranch size={22} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800">流程配置与模拟器</h2>
          <Tag color="blue" icon={<Sparkles size={12} />}>
            可视化
          </Tag>
        </div>
        <Space wrap>
          <Button
            icon={<FastForward size={14} />}
            type="primary"
            onClick={startAutoDemo}
            loading={isAutoPlaying}
          >
            {isAutoPlaying ? '演示中...' : '一键演示'}
          </Button>
          <Button
            icon={<RefreshCw size={14} />}
            onClick={handleResetSimulation}
            disabled={!simulation}
          >
            重置模拟
          </Button>
          <Button
            icon={<StepForward size={14} />}
            onClick={handleUndo}
            disabled={!simulation || simulation.history.length === 0 || isAutoPlaying}
          >
            撤销一步
          </Button>
        </Space>
      </div>

      {simulation && (
        <Card className="shadow-sm" size="small">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-green-500" />
              <span className="text-sm font-medium text-gray-700">流程进度</span>
            </div>
            <span className="text-sm text-blue-600 font-medium">{progressPercent}%</span>
          </div>
          <Progress
            percent={progressPercent}
            status={isFinalStatus ? 'success' : 'active'}
            showInfo={false}
            strokeColor={{
              '0%': '#1890ff',
              '100%': '#52c41a',
            }}
          />
          <Steps
            size="small"
            current={currentStepIndex}
            className="mt-3"
            items={mainFlowNodes.map((node) => ({
              title: node.name,
              description: null,
            }))}
          />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14} xl={14}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-blue-500" />
                <span className="font-semibold">流程配置</span>
              </div>
            }
            className="shadow-sm"
            extra={
              <Tag color={processConfig.enabled ? 'green' : 'default'}>
                {processConfig.enabled ? '已启用' : '已停用'}
              </Tag>
            }
          >
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {processConfig.name}
              </div>
              <div className="text-xs text-gray-500">{processConfig.description}</div>
            </div>

            <Divider className="my-3" />

            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CircleDot size={14} />
              主流程节点 ({mainFlowNodes.length})
            </div>

            <div className="relative space-y-1 mb-6">
              {mainFlowNodes.map((node, index) => {
                const nodeActions = processConfig.actions.filter((a) =>
                  node.allowedActions.includes(a.type)
                );
                const isActive = simulation?.currentStatus === node.status;
                const isPast =
                  simulation &&
                  sortedNodes.findIndex((n) => n.status === simulation.currentStatus) >
                    sortedNodes.findIndex((n) => n.status === node.status);

                return (
                  <div key={node.id} className="relative">
                    {index < mainFlowNodes.length - 1 && (
                      <div
                        className="absolute left-5 top-10 w-0.5 h-8 z-0"
                        style={{
                          backgroundColor: isPast ? '#52c41a' : '#e5e7eb',
                        }}
                      />
                    )}

                    <div
                      className={`relative border rounded-lg p-4 transition-all bg-white ${
                        isActive
                          ? 'border-blue-400 bg-blue-50/40 shadow-md ring-2 ring-blue-100'
                          : isPast
                          ? 'border-green-200 bg-green-50/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm ${
                              isActive
                                ? 'bg-blue-500'
                                : isPast
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {isPast ? <CheckCircle size={18} /> : node.order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-medium ${
                                  isActive || isPast ? 'text-gray-800' : 'text-gray-500'
                                }`}
                              >
                                {node.name}
                              </span>
                              <Tag
                                color={node.color as any}
                                style={{ fontSize: '11px', margin: 0 }}
                              >
                                {statusMap[node.status]}
                              </Tag>
                              {isActive && (
                                <Badge
                                  status="processing"
                                  text={
                                    <span className="text-xs text-blue-600 font-medium">
                                      当前状态
                                    </span>
                                  }
                                />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {node.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          icon={<Settings size={13} />}
                          onClick={() => handleEditNode(node)}
                        >
                          配置
                        </Button>
                      </div>

                      {nodeActions.length > 0 && (
                        <div className="mt-3 pl-13">
                          <div className="text-xs text-gray-400 mb-2">
                            可执行操作：
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {nodeActions.slice(0, 5).map((action) => (
                              <Tag
                                key={action.type}
                                color={
                                  action.role === 'supervisor'
                                    ? 'blue'
                                    : action.role === 'operator'
                                    ? 'green'
                                    : 'default'
                                }
                                style={{ fontSize: '11px', margin: 0 }}
                              >
                                {action.name}
                              </Tag>
                            ))}
                            {nodeActions.length > 5 && (
                              <Tag style={{ fontSize: '11px', margin: 0 }}>
                                +{nodeActions.length - 5}
                              </Tag>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sortedNodes
                .filter((n) => n.status === 'returned' || n.status === 'overdue')
                .map((node) => {
                  const nodeActions = processConfig.actions.filter((a) =>
                    node.allowedActions.includes(a.type)
                  );
                  const isActive = simulation?.currentStatus === node.status;

                  return (
                    <div
                      key={node.id}
                      className={`border rounded-lg p-3 transition-all ${
                        isActive
                          ? 'border-red-400 bg-red-50/40 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle
                          size={14}
                          className={isActive ? 'text-red-500' : 'text-gray-400'}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isActive ? 'text-gray-800' : 'text-gray-600'
                          }`}
                        >
                          {node.name}
                        </span>
                        <Tag color={node.color as any} style={{ fontSize: '10px' }}>
                          分支
                        </Tag>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{node.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {nodeActions.slice(0, 3).map((action) => (
                          <Tag
                            key={action.type}
                            color="default"
                            style={{ fontSize: '10px' }}
                          >
                            {action.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            <Divider className="my-4" />

            <div className="text-sm font-medium text-gray-700 mb-3">操作角色图例</div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">督办员操作</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600">经办人操作</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-gray-600">系统操作</span>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10} xl={10}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-orange-500" />
                <span className="font-semibold">流程模拟器</span>
              </div>
            }
            className="shadow-sm"
          >
            <div className="space-y-4">
              {!simulation && (
                <div className="text-center py-6">
                  <div className="text-sm text-gray-600 mb-3">选择模拟方式</div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      block
                      type="primary"
                      icon={<Sparkles size={14} />}
                      onClick={() => startQuickSimulation('pending_accept')}
                    >
                      快速模拟（从受理开始）
                    </Button>
                    <Button
                      block
                      icon={<FastForward size={14} />}
                      onClick={startAutoDemo}
                    >
                      一键自动演示完整流程
                    </Button>
                  </Space>
                  <Divider plain>
                    <span className="text-xs text-gray-400">或选择现有投诉</span>
                  </Divider>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  选择模拟投诉
                </label>
                <Select
                  showSearch
                  placeholder="选择现有投诉进行模拟"
                  style={{ width: '100%' }}
                  value={selectedComplaintId || undefined}
                  onChange={handleSelectComplaint}
                  options={complaintOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  allowClear
                />
              </div>

              {selectedComplaint && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">已选投诉信息</div>
                  <div className="text-sm font-medium text-gray-800 mb-1">
                    {selectedComplaint.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-mono text-blue-600">
                      {selectedComplaint.id}
                    </span>
                    <StatusTag status={selectedComplaint.status} />
                    <SourceTag source={selectedComplaint.source} />
                  </div>
                </div>
              )}

              {simulation && currentNode && (
                <>
                  <div
                    className="border rounded-lg p-4 overflow-hidden relative"
                    style={{
                      background: `linear-gradient(135deg, ${getStatusColor(
                        currentNode.color
                      )}10 0%, transparent 60%)`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        当前状态
                      </span>
                      {isFinalStatus && (
                        <Tag color="green" icon={<CheckCircle size={12} />}>
                          已办结
                        </Tag>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                        style={{ backgroundColor: getStatusColor(currentNode.color) }}
                      >
                        {isFinalStatus ? (
                          <CheckCircle size={26} />
                        ) : (
                          <Clock size={26} />
                        )}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-800">
                          {currentNode.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {currentNode.description}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>投诉编号：{simulation.complaintId}</span>
                      <span>已操作 {simulation.history.length} 步</span>
                    </div>
                  </div>

                  {availableActions.length > 0 && !isFinalStatus && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Play size={14} className="text-green-500" />
                        可执行操作
                      </div>
                      <div className="space-y-2">
                        {availableActions.map((action) => (
                          <Tooltip
                            key={action.type}
                            title={action.description}
                            placement="topLeft"
                          >
                            <Button
                              block
                              icon={getActionIcon(action.icon, 14)}
                              onClick={() => handleActionClick(action)}
                              className="justify-start h-10"
                              type={
                                action.type === 'process' ||
                                action.type === 'review_pass' ||
                                action.type === 'accept' ||
                                action.type === 'assign'
                                  ? 'primary'
                                  : 'default'
                              }
                              danger={
                                action.type === 'return' ||
                                action.type === 'review_reject' ||
                                action.type === 'delay_reject'
                              }
                              disabled={isAutoPlaying}
                            >
                              <span className="flex-1 text-left">
                                {action.name}
                              </span>
                              <span className="text-xs opacity-60">
                                {action.role === 'supervisor'
                                  ? '督办员'
                                  : action.role === 'operator'
                                  ? '经办人'
                                  : '系统'}
                              </span>
                            </Button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {isFinalStatus && (
                    <Alert
                      type="success"
                      showIcon
                      icon={<CheckCircle size={18} />}
                      message="流程已完成"
                      description="投诉已办结归档，整个流程执行完毕。你可以点击重置模拟重新开始。"
                    />
                  )}

                  <Divider className="my-3" />

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <History size={14} className="text-gray-500" />
                      操作历史
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {simulation.history.length} 步
                      </Tag>
                    </div>

                    {simulation.history.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <History size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">暂无操作记录</p>
                        <p className="text-xs">点击上方操作按钮开始模拟</p>
                      </div>
                    ) : (
                      <div className="max-h-[360px] overflow-y-auto pr-1">
                        <Timeline
                          items={[
                            {
                              color: 'gray',
                              dot: <Circle size={10} className="text-gray-300" />,
                              children: (
                                <div>
                                  <div className="text-xs text-gray-400">
                                    {simulation.startTimestamp}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    开始模拟 - 初始状态：
                                    <span className="font-medium">
                                      {statusMap[simulation.startStatus]}
                                    </span>
                                  </div>
                                </div>
                              ),
                            },
                            ...[...simulation.history].reverse().map((step) => ({
                              color: getTimelineColor(step),
                              dot: getTimelineDot(step),
                              children: (
                                <div className="mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="text-sm font-medium"
                                      style={{
                                        color:
                                          getTimelineColor(step) === 'red'
                                            ? '#ff4d4f'
                                            : getTimelineColor(step) === 'green'
                                            ? '#52c41a'
                                            : getTimelineColor(step) === 'blue'
                                            ? '#1890ff'
                                            : getTimelineColor(step) === 'orange'
                                            ? '#faad14'
                                            : getTimelineColor(step) === 'purple'
                                            ? '#722ed1'
                                            : '#1890ff',
                                      }}
                                    >
                                      {step.actionName}
                                    </span>
                                    {step.toStatus &&
                                      step.toStatus !== step.fromStatus && (
                                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                          <ChevronRight size={10} />
                                          {statusMap[step.toStatus]}
                                        </span>
                                      )}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {step.operator} · {step.timestamp}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded px-2.5 py-1.5 leading-relaxed">
                                    {step.content}
                                  </div>
                                </div>
                              ),
                            })),
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <div className="flex items-center gap-2">
            {currentAction && getActionIcon(currentAction.icon, 18)}
            <span>{currentAction?.name}</span>
          </div>
        }
        open={actionModalVisible}
        onCancel={() => {
          setActionModalVisible(false);
          setCurrentAction(null);
        }}
        footer={null}
        width={520}
        destroyOnClose
      >
        {currentAction && (
          <Form form={form} layout="vertical" onFinish={handleActionSubmit}>
            {currentAction.description && (
              <div className="bg-blue-50/60 rounded-lg p-3 mb-4 text-sm text-gray-600">
                {currentAction.description}
              </div>
            )}
            <Form.Item
              label={currentAction.inputLabel || '操作内容'}
              name="content"
              rules={[
                {
                  required: true,
                  message: `请输入${currentAction.inputLabel || '操作内容'}`,
                },
              ]}
            >
              <TextArea
                rows={4}
                placeholder={currentAction.inputPlaceholder || '请输入内容'}
              />
            </Form.Item>
            {simulation && (
              <div className="text-xs text-gray-500 mb-4 flex items-center gap-2 bg-gray-50 rounded p-2">
                <AlertTriangle size={12} className="text-orange-500" />
                <span>
                  状态变化：
                  <span className="font-medium">
                    {statusMap[simulation.currentStatus]}
                  </span>
                  {currentAction.toStatus && (
                    <>
                      {' → '}
                      <span className="text-blue-600 font-medium">
                        {statusMap[currentAction.toStatus]}
                      </span>
                    </>
                  )}
                  {!currentAction.toStatus && (
                    <span className="text-gray-400">（不改变状态）</span>
                  )}
                </span>
              </div>
            )}
            <Form.Item className="mb-0">
              <Space>
                <Button type="primary" htmlType="submit">
                  确认执行
                </Button>
                <Button
                  onClick={() => {
                    setActionModalVisible(false);
                    setCurrentAction(null);
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="编辑流程节点配置"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingNode(null);
        }}
        footer={null}
        width={620}
        destroyOnClose
      >
        {editingNode && (
          <Form form={editForm} layout="vertical" onFinish={handleSaveNode}>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">节点状态</div>
              <div className="flex items-center gap-2">
                <Tag color={editingNode.color as any}>
                  {statusMap[editingNode.status]}
                </Tag>
                <span className="text-sm text-gray-600">
                  顺序：第 {editingNode.order} 位
                </span>
              </div>
            </div>

            <Form.Item
              label="节点名称"
              name="name"
              rules={[{ required: true, message: '请输入节点名称' }]}
            >
              <Input placeholder="请输入节点名称" />
            </Form.Item>

            <Form.Item label="节点描述" name="description">
              <TextArea rows={2} placeholder="请输入节点描述" />
            </Form.Item>

            <Form.Item
              label="允许的操作"
              name="allowedActions"
              rules={[{ required: true, message: '请选择至少一个操作' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择该状态下允许执行的操作"
                style={{ width: '100%' }}
                optionRender={(option) => {
                  const action = processConfig.actions.find(
                    (a) => a.type === option.value
                  );
                  return (
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      <Tag color="default" style={{ fontSize: '10px' }}>
                        {action?.role === 'supervisor'
                          ? '督办员'
                          : action?.role === 'operator'
                          ? '经办人'
                          : '系统'}
                      </Tag>
                    </div>
                  );
                }}
              >
                {processConfig.actions.map((action) => (
                  <Select.Option key={action.type} value={action.type}>
                    {action.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <div className="text-xs text-gray-500 mb-4">
              提示：只有勾选的操作在该状态下才会显示为可执行按钮
            </div>

            <Form.Item className="mb-0">
              <Space>
                <Button type="primary" htmlType="submit">
                  保存配置
                </Button>
                <Button
                  onClick={() => {
                    setEditModalVisible(false);
                    setEditingNode(null);
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ProcessSimulator;
