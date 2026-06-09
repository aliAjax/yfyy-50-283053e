import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  message,
} from 'antd';
import {
  ArrowRight,
  Bell,
  CheckCircle,
  Copy,
  Download,
  FileJson,
  GitBranch,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  UserCog,
  Zap,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { StatusTag } from '@/components/StatusTags';
import type {
  AssignSource,
  ProcessAction,
  ProcessTraceExport,
  SimulationActionInput,
  SimulationRole,
  SimulationState,
  SimulationStep,
} from '@/types';
import { defaultProcessConfig, getNodeByStatus } from '@/data/processConfig';
import {
  assignSourceMap,
  departments,
  statusMap,
  timelineTypeMap,
} from '@/data/dictionaries';
import {
  copyTraceToClipboard,
  createQuickSimulation,
  createSimulationFromComplaint,
  downloadTraceAsJson,
  downloadTraceAsText,
  executeSimulationAction,
  exportProcessTrace,
  getAvailableActionsForRole,
  resetSimulation,
  switchSimulationRole,
  undoLastStep,
} from '@/lib/simulationEngine';

const { TextArea } = Input;

const roleLabels: Record<SimulationRole, string> = {
  supervisor: '督办员',
  operator: '经办人',
  system: '系统',
};

const roleOptions = [
  { label: '督办员', value: 'supervisor' },
  { label: '经办人', value: 'operator' },
];

const actionColorMap: Record<string, string> = {
  accept: 'blue',
  assign: 'blue',
  transfer: 'purple',
  process: 'cyan',
  return: 'red',
  delay_request: 'orange',
  delay_approve: 'green',
  delay_reject: 'red',
  urge: 'orange',
  review_pass: 'green',
  review_reject: 'red',
  followup: 'blue',
  complete: 'green',
};

const ProcessSimulator: React.FC = () => {
  const { complaints } = useAppStore();
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [role, setRole] = useState<SimulationRole>('supervisor');
  const [currentAction, setCurrentAction] = useState<ProcessAction | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [tracePreview, setTracePreview] = useState<ProcessTraceExport | null>(null);
  const [form] = Form.useForm();

  const sortedNodes = useMemo(
    () => [...defaultProcessConfig.nodes].sort((a, b) => a.order - b.order),
    []
  );

  const selectedComplaint = useMemo(
    () => complaints.find((complaint) => complaint.id === selectedComplaintId),
    [complaints, selectedComplaintId]
  );

  const currentNode = simulation
    ? getNodeByStatus(simulation.currentStatus, defaultProcessConfig.nodes)
    : undefined;

  const availableActions = simulation
    ? getAvailableActionsForRole(simulation, defaultProcessConfig.actions)
    : [];

  const pendingExtension = simulation?.extensionRequests.find(
    (request) => request.status === 'pending'
  );

  const unreadForRole = simulation
    ? simulation.notifications.filter(
        (notice) => notice.targetRole === simulation.currentRole && !notice.isRead
      ).length
    : 0;

  const complaintOptions = useMemo(
    () =>
      complaints.map((complaint) => ({
        label: `${complaint.id} - ${complaint.title}`,
        value: complaint.id,
      })),
    [complaints]
  );

  const startQuickSimulation = () => {
    const next = createQuickSimulation(role);
    setSimulation(next);
    setSelectedComplaintId('');
    message.success('已创建独立模拟工单，不影响真实投诉数据');
  };

  const handleSelectComplaint = (complaintId: string) => {
    const complaint = complaints.find((item) => item.id === complaintId);
    if (!complaint) return;
    setSelectedComplaintId(complaintId);
    setSimulation(createSimulationFromComplaint(complaint, role));
    message.success('已基于真实投诉只读复制模拟场景');
  };

  const handleRoleChange = (nextRole: SimulationRole) => {
    setRole(nextRole);
    setSimulation((prev) => (prev ? switchSimulationRole(prev, nextRole) : prev));
  };

  const handleActionClick = (action: ProcessAction) => {
    if (!simulation) return;
    setCurrentAction(action);
    form.resetFields();
    form.setFieldsValue({
      content: '',
      days: 3,
      assignSource: simulation.assignSource || 'manual',
      departmentId: simulation.departmentId,
      satisfaction: simulation.satisfaction || 5,
    });
    if (action.requiresInput || ['assign', 'transfer', 'delay_request', 'review_pass'].includes(action.type)) {
      setActionModalVisible(true);
      return;
    }
    doExecuteAction(action, {});
  };

  const doExecuteAction = (action: ProcessAction, input: SimulationActionInput) => {
    setSimulation((prev) => (prev ? executeSimulationAction(prev, action, input) : prev));
    setActionModalVisible(false);
    setCurrentAction(null);
    form.resetFields();
    message.success(`已模拟「${action.name}」`);
  };

  const handleActionSubmit = (values: {
    content?: string;
    departmentId?: string;
    days?: number;
    assignSource?: AssignSource;
    dispatchRuleName?: string;
    satisfaction?: number;
  }) => {
    if (!currentAction) return;
    const department = departments.find((dept) => dept.id === values.departmentId);
    doExecuteAction(currentAction, {
      ...values,
      reason: values.content,
      departmentName: department?.name,
    });
  };

  const handleUndo = () => {
    setSimulation((prev) => (prev ? undoLastStep(prev) : prev));
    message.info('已撤销最近一步模拟操作');
  };

  const handleReset = () => {
    if (!simulation) return;
    if (selectedComplaint) {
      setSimulation(createSimulationFromComplaint(selectedComplaint, role));
    } else {
      setSimulation(resetSimulation(simulation));
    }
    message.success('已重置模拟状态');
  };

  const handleAutoDemo = () => {
    const actions = defaultProcessConfig.actions;
    let next = createQuickSimulation(role);
    const accept = actions.find((action) => action.type === 'accept');
    const assign = actions.find((action) => action.type === 'assign');
    const process = actions.find((action) => action.type === 'process');
    const review = actions.find((action) => action.type === 'review_pass');
    if (accept) next = executeSimulationAction(next, accept, {});
    if (assign) {
      next = executeSimulationAction(next, assign, {
        departmentId: departments[0].id,
        departmentName: departments[0].name,
        assignSource: 'auto',
        dispatchRuleName: '东城区占道经营派单规则',
      });
    }
    if (process) {
      next = switchSimulationRole(next, 'operator');
      next = executeSimulationAction(next, process, {
        content: '已完成现场整治，清理占道经营点位并完成回访记录。',
      });
    }
    if (review) {
      next = switchSimulationRole(next, 'supervisor');
      next = executeSimulationAction(next, review, {
        content: '办理结果符合要求',
        satisfaction: 5,
      });
    }
    next = switchSimulationRole(next, role);
    setSelectedComplaintId('');
    setSimulation(next);
    message.success('已生成完整演示轨迹');
  };

  const handleCopyTrace = async () => {
    if (!simulation) return;
    await copyTraceToClipboard(simulation);
    message.success('流程轨迹文本已复制');
  };

  const actionNeedsDepartment = currentAction?.type === 'assign' || currentAction?.type === 'transfer';
  const actionNeedsDelay = currentAction?.type === 'delay_request';
  const actionNeedsAssignSource = currentAction?.type === 'assign';
  const actionNeedsSatisfaction = currentAction?.type === 'review_pass';

  const renderStepExtra = (step: SimulationStep) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <Tag color="default">{timelineTypeMap[step.timelineType] || step.timelineType}</Tag>
      {step.assignSource && (
        <Tag color={step.assignSource === 'auto' ? 'green' : 'orange'}>
          {assignSourceMap[step.assignSource]}
        </Tag>
      )}
      {step.departmentChanged && (
        <Tag color="purple">
          {step.departmentChanged.fromDepartmentName} {'->'} {step.departmentChanged.toDepartmentName}
        </Tag>
      )}
      {step.deadlineChanged && (
        <Tag color="orange">延期{step.deadlineChanged.days}天</Tag>
      )}
      {step.satisfaction && <Tag color="gold">满意度{step.satisfaction}分</Tag>}
      {step.notifications?.map((notice) => (
        <Tag key={notice.id} color="blue">
          通知:{notice.title}
        </Tag>
      ))}
      {step.isSystemStep && <Tag color="default">系统步骤</Tag>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <GitBranch size={22} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800">流程配置与模拟器</h2>
          <Tag color="blue">独立模拟</Tag>
        </div>
        <Space wrap>
          <Button icon={<Zap size={14} />} onClick={handleAutoDemo}>
            一键演示
          </Button>
          <Button icon={<RefreshCw size={14} />} onClick={handleReset} disabled={!simulation}>
            重置
          </Button>
          <Button
            icon={<RotateCcw size={14} />}
            onClick={handleUndo}
            disabled={!simulation || simulation.history.length === 0}
          >
            撤销
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card title="流程节点" className="shadow-sm">
            <Radio.Group
              value={role}
              onChange={(event) => handleRoleChange(event.target.value)}
              optionType="button"
              buttonStyle="solid"
              options={roleOptions}
              className="mb-4"
            />
            <Steps
              direction="vertical"
              current={
                simulation
                  ? sortedNodes.findIndex((node) => node.status === simulation.currentStatus)
                  : 0
              }
              items={sortedNodes.map((node) => ({
                title: node.name,
                description: node.description,
                status:
                  simulation?.currentStatus === node.status
                    ? 'process'
                    : node.status === 'completed' && simulation?.currentStatus === 'completed'
                    ? 'finish'
                    : 'wait',
              }))}
            />
            <Divider />
            <div className="space-y-2">
              {defaultProcessConfig.actions.map((action) => (
                <div
                  key={action.type}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm"
                >
                  <span>{action.name}</span>
                  <Tag color={action.role === 'operator' ? 'green' : action.role === 'system' ? 'default' : 'blue'}>
                    {roleLabels[action.role || 'system']}
                  </Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="模拟执行" className="shadow-sm">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div className="grid grid-cols-2 gap-2">
                <Button type="primary" icon={<Play size={14} />} onClick={startQuickSimulation}>
                  快速模拟
                </Button>
                <Select
                  showSearch
                  placeholder="选择真实投诉只读模拟"
                  value={selectedComplaintId || undefined}
                  options={complaintOptions}
                  onChange={handleSelectComplaint}
                  allowClear
                  filterOption={(input, option) =>
                    (option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>

              {!simulation ? (
                <Empty description="请选择或创建一个模拟场景" />
              ) : (
                <>
                  <Card size="small" className="bg-gray-50">
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="投诉编号">{simulation.complaintId}</Descriptions.Item>
                      <Descriptions.Item label="标题">{simulation.complaintTitle}</Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag status={simulation.currentStatus} />
                        {currentNode && (
                          <span className="ml-2 text-xs text-gray-500">
                            {currentNode.description}
                          </span>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="当前角色">
                        <Tag color={simulation.currentRole === 'operator' ? 'green' : 'blue'}>
                          {roleLabels[simulation.currentRole]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="责任部门">{simulation.departmentName}</Descriptions.Item>
                      <Descriptions.Item label="截止时间">
                        <span className={dayjs(simulation.deadline).diff(dayjs(), 'day') < 2 ? 'text-red-500' : ''}>
                          {simulation.deadline}
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="派单方式">
                        {simulation.assignSource ? assignSourceMap[simulation.assignSource] : '未派单'}
                        {simulation.dispatchRuleName ? ` · ${simulation.dispatchRuleName}` : ''}
                      </Descriptions.Item>
                      <Descriptions.Item label="满意度">
                        {simulation.satisfaction ? `${simulation.satisfaction}分` : '未评价'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {pendingExtension && simulation.currentRole === 'supervisor' && (
                    <Alert
                      type="warning"
                      showIcon
                      message={`待审批延期申请：${pendingExtension.days}天`}
                      description={pendingExtension.reason}
                    />
                  )}

                  <Row gutter={8}>
                    <Col span={8}>
                      <Statistic title="操作步骤" value={simulation.history.length} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="通知" value={simulation.notifications.length} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="催办" value={simulation.urgeCount} />
                    </Col>
                  </Row>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <UserCog size={14} />
                      当前角色可执行动作
                      {unreadForRole > 0 && <Badge count={unreadForRole} />}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {availableActions.map((action) => (
                        <Button
                          key={action.type}
                          type={
                            ['accept', 'assign', 'process', 'review_pass'].includes(action.type)
                              ? 'primary'
                              : 'default'
                          }
                          danger={['return', 'review_reject', 'delay_reject'].includes(action.type)}
                          icon={<ArrowRight size={14} />}
                          onClick={() => handleActionClick(action)}
                        >
                          {action.name}
                        </Button>
                      ))}
                      {availableActions.length === 0 && (
                        <Alert type="info" showIcon message="当前角色在此状态下没有可执行动作" />
                      )}
                    </div>
                  </div>

                  <Divider />
                  <Space wrap>
                    <Button icon={<FileJson size={14} />} onClick={() => downloadTraceAsJson(simulation)}>
                      导出JSON
                    </Button>
                    <Button icon={<Download size={14} />} onClick={() => downloadTraceAsText(simulation)}>
                      导出TXT
                    </Button>
                    <Button icon={<Copy size={14} />} onClick={handleCopyTrace}>
                      复制轨迹
                    </Button>
                    <Button onClick={() => setTracePreview(exportProcessTrace(simulation))}>
                      预览
                    </Button>
                  </Space>
                </>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={7}>
          <Card
            title={
              <Space>
                <Bell size={16} />
                <span>通知与延期</span>
              </Space>
            }
            className="shadow-sm"
          >
            {!simulation ? (
              <Empty description="暂无模拟通知" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <List
                  size="small"
                  dataSource={simulation.notifications}
                  locale={{ emptyText: '暂无通知' }}
                  renderItem={(notice) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <span>{notice.title}</span>
                            <Tag color={notice.targetRole === 'operator' ? 'green' : 'blue'}>
                              {roleLabels[notice.targetRole]}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <div>{notice.content}</div>
                            <div className="text-xs text-gray-400">{notice.createdAt}</div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
                <Divider className="my-1" />
                <Table
                  size="small"
                  pagination={false}
                  rowKey="id"
                  dataSource={simulation.extensionRequests}
                  columns={[
                    { title: '天数', dataIndex: 'days', width: 56 },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (value) => (
                        <Tag color={value === 'approved' ? 'green' : value === 'rejected' ? 'red' : 'orange'}>
                          {value === 'approved' ? '已通过' : value === 'rejected' ? '已驳回' : '待审批'}
                        </Tag>
                      ),
                    },
                    { title: '原因', dataIndex: 'reason' },
                  ]}
                />
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <History size={16} />
            <span>流程轨迹</span>
          </Space>
        }
        className="shadow-sm"
      >
        {!simulation || simulation.history.length === 0 ? (
          <Empty description="暂无流程轨迹" />
        ) : (
          <Timeline
            items={simulation.history.map((step) => ({
              color: actionColorMap[step.actionType] || 'blue',
              dot: step.isSystemStep ? <CheckCircle size={12} /> : undefined,
              children: (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{step.actionName}</span>
                    <Tag color={actionColorMap[step.actionType] || 'blue'}>
                      {roleLabels[step.operatorRole]}
                    </Tag>
                    {step.toStatus && step.toStatus !== step.fromStatus && (
                      <span className="text-xs text-gray-500">
                        {statusMap[step.fromStatus]} {'->'} {statusMap[step.toStatus]}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {step.operator} · {step.timestamp}
                  </div>
                  <div className="mt-1 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {step.content}
                  </div>
                  {renderStepExtra(step)}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      <Modal
        title={currentAction?.name}
        open={actionModalVisible}
        onCancel={() => {
          setActionModalVisible(false);
          setCurrentAction(null);
        }}
        footer={null}
        width={560}
        destroyOnClose
      >
        {currentAction && (
          <Form form={form} layout="vertical" onFinish={handleActionSubmit}>
            <Alert
              type="info"
              showIcon
              className="mb-4"
              message={`模拟${currentAction.name}`}
              description="本操作只写入模拟状态，不会调用真实投诉store写操作。"
            />
            {actionNeedsDepartment && (
              <Form.Item
                label={currentAction.type === 'assign' ? '派单部门' : '转办部门'}
                name="departmentId"
                rules={[{ required: true, message: '请选择责任部门' }]}
              >
                <Select
                  showSearch
                  options={departments.map((dept) => ({ label: dept.name, value: dept.id }))}
                  filterOption={(input, option) =>
                    (option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            )}
            {actionNeedsAssignSource && (
              <>
                <Form.Item label="派单方式" name="assignSource">
                  <Radio.Group>
                    <Radio value="manual">人工派单</Radio>
                    <Radio value="auto">智能派单</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="派单规则名称" name="dispatchRuleName">
                  <Input placeholder="例如：东城区占道经营派单规则" />
                </Form.Item>
              </>
            )}
            {actionNeedsDelay && (
              <Form.Item
                label="延期天数"
                name="days"
                rules={[{ required: true, message: '请选择延期天数' }]}
              >
                <Select
                  options={[
                    { label: '3天', value: 3 },
                    { label: '5天', value: 5 },
                    { label: '7天', value: 7 },
                    { label: '10天', value: 10 },
                  ]}
                />
              </Form.Item>
            )}
            {actionNeedsSatisfaction && (
              <Form.Item label="满意度" name="satisfaction">
                <Radio.Group>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Radio key={score} value={score}>
                      {score}分
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            )}
            <Form.Item
              label={currentAction.inputLabel || '操作内容'}
              name="content"
              rules={[
                {
                  required: currentAction.requiresInput,
                  message: `请输入${currentAction.inputLabel || '操作内容'}`,
                },
              ]}
            >
              <TextArea rows={4} placeholder={currentAction.inputPlaceholder || '请输入内容'} />
            </Form.Item>
            <Form.Item className="mb-0">
              <Space>
                <Button type="primary" htmlType="submit" icon={<Send size={14} />}>
                  确认模拟
                </Button>
                <Button onClick={() => setActionModalVisible(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="流程轨迹预览"
        open={!!tracePreview}
        onCancel={() => setTracePreview(null)}
        footer={null}
        width={800}
      >
        {tracePreview && (
          <div className="space-y-4">
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="投诉编号">{tracePreview.summary.complaintId}</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                {statusMap[tracePreview.summary.currentStatus]}
              </Descriptions.Item>
              <Descriptions.Item label="步骤数">{tracePreview.summary.stepCount}</Descriptions.Item>
              <Descriptions.Item label="通知数">{tracePreview.summary.notificationCount}</Descriptions.Item>
              <Descriptions.Item label="延期申请">
                {tracePreview.summary.extensionRequestCount}
              </Descriptions.Item>
              <Descriptions.Item label="满意度">
                {tracePreview.summary.satisfaction ? `${tracePreview.summary.satisfaction}分` : '无'}
              </Descriptions.Item>
            </Descriptions>
            <pre className="max-h-[420px] overflow-auto rounded bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
              {tracePreview.timelineText}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProcessSimulator;
