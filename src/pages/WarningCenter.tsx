import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  message,
  Progress,
  Switch,
  InputNumber,
  Alert,
  Statistic,
  Tooltip,
  Divider,
  Empty,
} from 'antd';
import {
  AlertTriangle,
  Clock,
  Bell,
  Eye,
  Send,
  Filter,
  Zap,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  CheckCircle,
  Clock4,
  Frown,
  GitMerge,
  RefreshCw,
  ShieldAlert,
  Building2,
  MapPin,
  FolderTree,
  Globe,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type {
  Complaint,
  ExtensionRequest,
  RiskRule,
  WarningAlert,
  RiskRuleType,
  RiskLevel,
  WarningStatus,
  RiskRuleScope,
} from '@/types';
import { areas, departments, categories } from '@/data/dictionaries';

type PageView = 'alerts' | 'rules';

const ruleTypeMeta: Record<RiskRuleType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  expiring: {
    label: '临期预警',
    icon: <Clock size={16} className="text-orange-500" />,
    color: 'orange',
    desc: '距离办理时限不足阈值的工单',
  },
  overdue: {
    label: '超期预警',
    icon: <AlertTriangle size={16} className="text-red-500" />,
    color: 'red',
    desc: '已超过办理时限仍未办结的工单',
  },
  multi_urge: {
    label: '多次催办预警',
    icon: <Bell size={16} className="text-purple-500" />,
    color: 'purple',
    desc: '被催办次数达到阈值的工单',
  },
  repeat_cluster: {
    label: '重复投诉聚集',
    icon: <GitMerge size={16} className="text-pink-500" />,
    color: 'pink',
    desc: '同一区域/问题重复投诉达到阈值',
  },
  low_satisfaction: {
    label: '低满意度预警',
    icon: <Frown size={16} className="text-orange-500" />,
    color: 'orange',
    desc: '已办结工单满意度低于阈值',
  },
};

const warningStatusMeta: Record<WarningStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'red' },
  processing: { label: '处理中', color: 'orange' },
  handled: { label: '已处理', color: 'green' },
  ignored: { label: '已忽略', color: 'default' },
};

const scopeTypeMeta: Record<RiskRuleScope, { label: string; icon: React.ReactNode }> = {
  all: { label: '全部工单', icon: <Globe size={14} /> },
  department: { label: '指定部门', icon: <Building2 size={14} /> },
  area: { label: '指定区域', icon: <MapPin size={14} /> },
  category: { label: '指定分类', icon: <FolderTree size={14} /> },
};

const WarningCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    complaints,
    extensionRequests,
    riskRules,
    warningAlerts,
    batchUrge,
    addRiskRule,
    updateRiskRule,
    deleteRiskRule,
    toggleRiskRuleStatus,
    updateWarningStatus,
    evaluateRiskRules,
  } = useAppStore();

  const [pageView, setPageView] = useState<PageView>('alerts');
  const [activeRuleType, setActiveRuleType] = useState<RiskRuleType | 'all' | 'delayPending'>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [urgeForm] = Form.useForm();
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [ruleForm] = Form.useForm();
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [handleForm] = Form.useForm();
  const [currentWarning, setCurrentWarning] = useState<WarningAlert | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [alertFilters, setAlertFilters] = useState({
    departmentId: undefined as string | undefined,
    areaId: undefined as string | undefined,
    riskLevel: undefined as RiskLevel | undefined,
    status: undefined as WarningStatus | undefined,
  });

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'rules') setPageView('rules');
  }, [searchParams]);

  const getRiskTag = (level: RiskLevel) => {
    const colorMap = { high: 'red', medium: 'orange', low: 'green' };
    const textMap = { high: '高风险', medium: '中风险', low: '低风险' };
    return <Tag color={colorMap[level]}>{textMap[level]}</Tag>;
  };

  const getProgressPercent = (complaint: Complaint): number => {
    const total = dayjs(complaint.deadline).diff(dayjs(complaint.createdAt), 'hour');
    const elapsed = dayjs().diff(dayjs(complaint.createdAt), 'hour');
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getProgressColor = (complaint: Complaint): string => {
    const isOverdue = dayjs().isAfter(dayjs(complaint.deadline)) && complaint.status !== 'completed';
    const daysLeft = dayjs(complaint.deadline).diff(dayjs(), 'day');
    if (isOverdue) return '#ff4d4f';
    if (daysLeft <= 1) return '#faad14';
    return '#52c41a';
  };

  const delayPendingList = extensionRequests.filter((r) => r.status === 'pending');

  const filteredAlerts = useMemo(() => {
    return warningAlerts.filter((alert) => {
      if (activeRuleType !== 'all' && alert.ruleType !== activeRuleType) return false;
      const complaint = complaints.find((c) => c.id === alert.complaintId);
      if (!complaint) return false;
      if (alertFilters.departmentId && complaint.departmentId !== alertFilters.departmentId) return false;
      if (alertFilters.areaId && complaint.areaId !== alertFilters.areaId) return false;
      if (alertFilters.riskLevel && alert.riskLevel !== alertFilters.riskLevel) return false;
      if (alertFilters.status && alert.status !== alertFilters.status) return false;
      return true;
    });
  }, [warningAlerts, activeRuleType, alertFilters, complaints]);

  const pendingCount = warningAlerts.filter((a) => a.status === 'pending').length;
  const processingCount = warningAlerts.filter((a) => a.status === 'processing').length;
  const handledCount = warningAlerts.filter((a) => a.status === 'handled').length;
  const highRiskCount = warningAlerts.filter(
    (a) => a.riskLevel === 'high' && (a.status === 'pending' || a.status === 'processing')
  ).length;

  const handleViewChange = (view: PageView) => {
    setPageView(view);
    const params = new URLSearchParams(searchParams);
    if (view === 'rules') params.set('view', 'rules');
    else params.delete('view');
    setSearchParams(params);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    evaluateRiskRules();
    setTimeout(() => {
      setRefreshing(false);
      message.success('预警规则评估完成');
    }, 600);
  };

  const handleSingleUrge = (id: string) => {
    setSelectedRowKeys([id]);
    setUrgeModalVisible(true);
  };

  const handleBatchUrge = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要催办的工单');
      return;
    }
    setUrgeModalVisible(true);
  };

  const handleUrgeSubmit = (values: { content?: string }) => {
    const ids = selectedRowKeys.map((key) => {
      const alert = warningAlerts.find((a) => a.id === key);
      return alert?.complaintId || String(key);
    });
    const uniqueIds = Array.from(new Set(ids));
    batchUrge(uniqueIds, values.content);
    message.success(`已向 ${uniqueIds.length} 条工单发送催办通知`);
    setUrgeModalVisible(false);
    setSelectedRowKeys([]);
    urgeForm.resetFields();
  };

  const handleOpenRuleModal = (rule?: RiskRule) => {
    setEditingRule(rule || null);
    if (rule) {
      ruleForm.setFieldsValue({
        name: rule.name,
        type: rule.type,
        description: rule.description,
        priority: rule.priority,
        enabled: rule.enabled,
        scopeType: rule.scope.type,
        departmentIds: rule.scope.departmentIds,
        areaIds: rule.scope.areaIds,
        categoryIds: rule.scope.categoryIds,
        daysLeft: rule.threshold.daysLeft,
        urgeCount: rule.threshold.urgeCount,
        repeatCount: rule.threshold.repeatCount,
        repeatDays: rule.threshold.repeatDays,
        satisfactionBelow: rule.threshold.satisfactionBelow,
      });
    } else {
      ruleForm.resetFields();
      ruleForm.setFieldsValue({
        enabled: true,
        priority: 80,
        scopeType: 'all',
        daysLeft: 2,
        urgeCount: 2,
        repeatCount: 3,
        repeatDays: 7,
        satisfactionBelow: 3,
      });
    }
    setRuleModalVisible(true);
  };

  const handleRuleSubmit = (values: {
    name: string;
    type: RiskRuleType;
    description?: string;
    priority: number;
    enabled: boolean;
    scopeType: RiskRuleScope;
    departmentIds?: string[];
    areaIds?: string[];
    categoryIds?: string[];
    daysLeft?: number;
    urgeCount?: number;
    repeatCount?: number;
    repeatDays?: number;
    satisfactionBelow?: number;
  }) => {
    const scope = {
      type: values.scopeType as RiskRuleScope,
      departmentIds: values.scopeType === 'department' ? values.departmentIds : undefined,
      areaIds: values.scopeType === 'area' ? values.areaIds : undefined,
      categoryIds: values.scopeType === 'category' ? values.categoryIds : undefined,
    };

    const threshold: RiskRule['threshold'] = {};
    switch (values.type) {
      case 'expiring':
        threshold.daysLeft = values.daysLeft;
        break;
      case 'multi_urge':
        threshold.urgeCount = values.urgeCount;
        break;
      case 'repeat_cluster':
        threshold.repeatCount = values.repeatCount;
        threshold.repeatDays = values.repeatDays;
        break;
      case 'low_satisfaction':
        threshold.satisfactionBelow = values.satisfactionBelow;
        break;
    }

    const ruleData = {
      name: values.name,
      type: values.type as RiskRuleType,
      description: values.description,
      priority: values.priority,
      enabled: values.enabled,
      threshold,
      scope,
      creator: '系统管理员',
    };

    if (editingRule) {
      updateRiskRule(editingRule.id, ruleData);
      message.success('规则已更新');
    } else {
      addRiskRule(ruleData);
      message.success('规则已创建');
    }
    setRuleModalVisible(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (rule: RiskRule) => {
    Modal.confirm({
      title: '确认删除规则',
      content: `确定要删除规则「${rule.name}」吗？相关预警记录也会被清除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteRiskRule(rule.id);
        message.success('规则已删除');
      },
    });
  };

  const handleOpenHandleModal = (alert: WarningAlert) => {
    setCurrentWarning(alert);
    handleForm.resetFields();
    handleForm.setFieldsValue({
      status: alert.status === 'pending' ? 'processing' : alert.status,
    });
    setHandleModalVisible(true);
  };

  const handleHandleSubmit = (values: { status: WarningStatus; remark?: string }) => {
    if (!currentWarning) return;
    updateWarningStatus(currentWarning.id, values.status, '督办员', values.remark);
    message.success('预警状态已更新');
    setHandleModalVisible(false);
    setCurrentWarning(null);
  };

  const alertColumns: ColumnsType<WarningAlert> = [
    {
      title: '预警编号',
      dataIndex: 'id',
      width: 120,
      fixed: 'left',
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '预警类型',
      dataIndex: 'ruleType',
      width: 140,
      render: (type: RiskRuleType) => {
        const meta = ruleTypeMeta[type];
        return (
          <Tag color={meta.color} icon={meta.icon}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      width: 140,
      ellipsis: true,
    },
    {
      title: '关联工单',
      dataIndex: 'complaintId',
      width: 240,
      render: (complaintId, record) => {
        const complaint = complaints.find((c) => c.id === complaintId);
        if (!complaint) {
          return <span className="text-gray-400">{record.complaintTitle}</span>;
        }
        return (
          <div>
            <span className="text-blue-600 font-mono text-xs">{complaintId}</span>
            <div className="text-gray-700 text-sm truncate max-w-[200px]" title={complaint.title}>
              {complaint.title}
            </div>
          </div>
        );
      },
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 100,
      render: (level: RiskLevel) => getRiskTag(level),
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      width: 100,
      render: (status: WarningStatus) => {
        const meta = warningStatusMeta[status];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '工单信息',
      dataIndex: 'complaintId',
      width: 200,
      render: (complaintId) => {
        const complaint = complaints.find((c) => c.id === complaintId);
        if (!complaint) return null;
        return (
          <div>
            <div className="text-xs text-gray-500">{complaint.departmentName}</div>
            <div className="text-xs text-gray-400">{complaint.areaName}</div>
            <div className="mt-1">
              <Progress
                percent={Math.round(getProgressPercent(complaint))}
                strokeColor={getProgressColor(complaint)}
                size="small"
                showInfo={false}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: '触发时间',
      dataIndex: 'triggeredAt',
      width: 160,
      sorter: (a, b) => dayjs(a.triggeredAt).valueOf() - dayjs(b.triggeredAt).valueOf(),
      render: (time, record) => (
        <div>
          <span className="text-gray-600 text-sm">{time}</span>
          {record.handledAt && (
            <div className="text-xs text-gray-400 mt-0.5">处理于 {record.handledAt}</div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/complaints/${record.complaintId}`)}
          >
            查看工单
          </Button>
          {(record.status === 'pending' || record.status === 'processing') && (
            <>
              <Button
                type="link"
                size="small"
                danger
                icon={<Bell size={14} />}
                onClick={() => handleSingleUrge(record.id)}
              >
                催办
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircle size={14} />}
                onClick={() => handleOpenHandleModal(record)}
              >
                处理
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const delayColumns: ColumnsType<ExtensionRequest> = [
    {
      title: '申请编号',
      dataIndex: 'id',
      width: 120,
      fixed: 'left',
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '投诉标题',
      dataIndex: 'complaintTitle',
      width: 240,
      ellipsis: true,
    },
    {
      title: '申请部门',
      dataIndex: 'departmentName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '申请延期',
      dataIndex: 'days',
      width: 100,
      render: (days: number) => <Tag color="orange">{days} 天</Tag>,
    },
    {
      title: '申请原因',
      dataIndex: 'reason',
      width: 250,
      ellipsis: true,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 160,
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/complaints/${record.complaintId}`)}
          >
            查看投诉
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Clock4 size={14} />}
            onClick={() => navigate(`/supervision?tab=delay`)}
          >
            去审批
          </Button>
        </Space>
      ),
    },
  ];

  const ruleColumns: ColumnsType<RiskRule> = [
    {
      title: '规则编号',
      dataIndex: 'id',
      width: 100,
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 160,
      render: (name, record) => (
        <div className="flex items-center gap-2">
          {ruleTypeMeta[record.type].icon}
          <span className="font-medium text-gray-800">{name}</span>
        </div>
      ),
    },
    {
      title: '规则类型',
      dataIndex: 'type',
      width: 130,
      render: (type: RiskRuleType) => {
        const meta = ruleTypeMeta[type];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '阈值配置',
      dataIndex: 'threshold',
      width: 200,
      render: (threshold, record) => {
        const parts: string[] = [];
        switch (record.type) {
          case 'expiring':
            parts.push(`临期${threshold.daysLeft ?? 2}天内`);
            break;
          case 'overdue':
            parts.push('已超过办理时限');
            break;
          case 'multi_urge':
            parts.push(`催办≥${threshold.urgeCount ?? 2}次`);
            break;
          case 'repeat_cluster':
            parts.push(`重复≥${threshold.repeatCount ?? 3}次/${threshold.repeatDays ?? 7}天`);
            break;
          case 'low_satisfaction':
            parts.push(`满意度<${threshold.satisfactionBelow ?? 3}分`);
            break;
        }
        return parts.length > 0 ? (
          <Space size={4} wrap>
            {parts.map((p, i) => (
              <Tag key={i} color="blue">{p}</Tag>
            ))}
          </Space>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      title: '适用范围',
      dataIndex: 'scope',
      width: 180,
      render: (scope) => {
        const meta = scopeTypeMeta[scope.type];
        let detail = '';
        if (scope.type === 'department' && scope.departmentIds?.length) {
          detail = scope.departmentIds
            .map((id) => departments.find((d) => d.id === id)?.name)
            .filter(Boolean)
            .join('、');
        } else if (scope.type === 'area' && scope.areaIds?.length) {
          detail = scope.areaIds
            .map((id) => areas.find((a) => a.id === id)?.name)
            .filter(Boolean)
            .join('、');
        } else if (scope.type === 'category' && scope.categoryIds?.length) {
          detail = scope.categoryIds
            .map((id) => categories.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join('、');
        }
        return (
          <div>
            <div className="flex items-center gap-1 text-gray-700">
              {meta.icon}
              <span>{meta.label}</span>
            </div>
            {detail && <div className="text-xs text-gray-400 mt-0.5 truncate" title={detail}>{detail}</div>}
          </div>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (p) => (
        <Tag color={p >= 90 ? 'red' : p >= 70 ? 'orange' : 'green'}>
          {p}
        </Tag>
      ),
    },
    {
      title: '预警数',
      dataIndex: 'id',
      width: 90,
      render: (id) => {
        const count = warningAlerts.filter((a) => a.ruleId === id).length;
        return (
          <span className={count > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
            {count} 条
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (enabled, record) => (
        <Tooltip title={enabled ? '点击禁用' : '点击启用'}>
          <Switch
            checked={enabled}
            checkedChildren={<Power size={12} />}
            unCheckedChildren={<PowerOff size={12} />}
            onChange={() => toggleRiskRuleStatus(record.id)}
          />
        </Tooltip>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
      sorter: (a, b) => dayjs(a.updatedAt).valueOf() - dayjs(b.updatedAt).valueOf(),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Edit3 size={14} />}
            onClick={() => handleOpenRuleModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleDeleteRule(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const alertTabItems = [
    {
      key: 'all',
      label: (
        <span className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-blue-500" />
          全部预警
          <Tag color="blue" className="ml-1">
            {warningAlerts.length}
          </Tag>
        </span>
      ),
    },
    ...Object.entries(ruleTypeMeta).map(([key, meta]) => {
      const count = warningAlerts.filter((a) => a.ruleType === key).length;
      return {
        key,
        label: (
          <span className="flex items-center gap-2">
            {meta.icon}
            {meta.label}
            <Tag color={meta.color} className="ml-1">
              {count}
            </Tag>
          </span>
        ),
      };
    }),
    {
      key: 'delayPending',
      label: (
        <span className="flex items-center gap-2">
          <Clock4 size={16} className="text-cyan-500" />
          延期待审批
          <Tag color="cyan" className="ml-1">
            {delayPendingList.length}
          </Tag>
        </span>
      ),
    },
  ];

  const ruleTypeOptions = Object.entries(ruleTypeMeta).map(([value, meta]) => ({
    label: (
      <span className="flex items-center gap-2">
        {meta.icon}
        {meta.label}
        <span className="text-gray-400 text-xs">- {meta.desc}</span>
      </span>
    ),
    value,
  }));

  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 12]} align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <Statistic
                title="待处理预警"
                value={pendingCount}
                valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
                prefix={<AlertTriangle size={18} />}
              />
              <Statistic
                title="处理中"
                value={processingCount}
                valueStyle={{ color: '#faad14', fontSize: 20 }}
                prefix={<Clock size={18} />}
              />
              <Statistic
                title="高风险预警"
                value={highRiskCount}
                valueStyle={{ color: '#cf1322', fontSize: 20 }}
                prefix={<ShieldAlert size={18} />}
              />
              <Statistic
                title="已处理"
                value={handledCount}
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
                prefix={<CheckCircle size={18} />}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<RefreshCw size={16} />}
                onClick={handleRefresh}
                loading={refreshing}
              >
                重新评估
              </Button>
              <Button
                type={pageView === 'alerts' ? 'primary' : 'default'}
                icon={<ShieldAlert size={16} />}
                onClick={() => handleViewChange('alerts')}
              >
                预警结果
              </Button>
              <Button
                type={pageView === 'rules' ? 'primary' : 'default'}
                icon={<Settings size={16} />}
                onClick={() => handleViewChange('rules')}
              >
                规则配置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {pageView === 'alerts' && (
        <>
          <Card className="shadow-sm" styles={{ body: { padding: '16px 20px' } }}>
            <Row gutter={[16, 16]} align="middle">
              <Col span={5}>
                <Select
                  placeholder="责任单位"
                  allowClear
                  style={{ width: '100%' }}
                  value={alertFilters.departmentId}
                  onChange={(val) => setAlertFilters((f) => ({ ...f, departmentId: val }))}
                  showSearch
                  optionFilterProp="children"
                  options={departments.map((d) => ({ label: d.name, value: d.id }))}
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="区域"
                  allowClear
                  style={{ width: '100%' }}
                  value={alertFilters.areaId}
                  onChange={(val) => setAlertFilters((f) => ({ ...f, areaId: val }))}
                  options={areas.map((a) => ({ label: a.name, value: a.id }))}
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="风险等级"
                  allowClear
                  style={{ width: '100%' }}
                  value={alertFilters.riskLevel}
                  onChange={(val) => setAlertFilters((f) => ({ ...f, riskLevel: val }))}
                  options={[
                    { label: '高风险', value: 'high' },
                    { label: '中风险', value: 'medium' },
                    { label: '低风险', value: 'low' },
                  ]}
                />
              </Col>
              <Col span={4}>
                <Select
                  placeholder="处理状态"
                  allowClear
                  style={{ width: '100%' }}
                  value={alertFilters.status}
                  onChange={(val) => setAlertFilters((f) => ({ ...f, status: val }))}
                  options={Object.entries(warningStatusMeta).map(([value, meta]) => ({
                    label: meta.label,
                    value,
                  }))}
                />
              </Col>
              <Col span={3}>
                <Button
                  icon={<Filter size={16} />}
                  onClick={() =>
                    setAlertFilters({
                      departmentId: undefined,
                      areaId: undefined,
                      riskLevel: undefined,
                      status: undefined,
                    })
                  }
                >
                  重置
                </Button>
              </Col>
              <Col span={4}>
                {selectedRowKeys.length > 0 && activeRuleType !== 'delayPending' && (
                  <Button
                    type="primary"
                    danger
                    icon={<Send size={16} />}
                    onClick={handleBatchUrge}
                    className="w-full"
                  >
                    批量催办 ({selectedRowKeys.length})
                  </Button>
                )}
              </Col>
            </Row>
          </Card>

          <Card className="shadow-sm" styles={{ body: { padding: '12px 24px 0' } }}>
            <Tabs
              activeKey={activeRuleType}
              onChange={(key) => {
                setActiveRuleType(key as RiskRuleType | 'all' | 'delayPending');
                setSelectedRowKeys([]);
              }}
              items={alertTabItems.map((item) => ({
                ...item,
                children:
                  item.key === 'delayPending' ? (
                    <Table
                      rowKey="id"
                      columns={delayColumns}
                      dataSource={delayPendingList}
                      scroll={{ x: 1100 }}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                    />
                  ) : (
                    <Table
                      rowKey="id"
                      columns={alertColumns}
                      dataSource={filteredAlerts}
                      scroll={{ x: 1500 }}
                      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
                      rowSelection={
                        item.key !== 'delayPending'
                          ? {
                              selectedRowKeys,
                              onChange: setSelectedRowKeys,
                              getCheckboxProps: (record: WarningAlert) => ({
                                disabled: record.status === 'handled' || record.status === 'ignored',
                              }),
                            }
                          : undefined
                      }
                      locale={{
                        emptyText: (
                          <Empty
                            description={
                              <span className="text-gray-400">
                                暂无预警记录，点击「重新评估」可触发规则扫描
                              </span>
                            }
                          />
                        ),
                      }}
                    />
                  ),
              }))}
              size="large"
            />
          </Card>
        </>
      )}

      {pageView === 'rules' && (
        <>
          <Card
            className="shadow-sm"
            title={
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-blue-500" />
                <span>风险规则配置</span>
                <span className="text-sm text-gray-400 font-normal">
                  共 {riskRules.length} 条规则
                </span>
              </div>
            }
            extra={
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => handleOpenRuleModal()}
              >
                新建规则
              </Button>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              rowKey="id"
              columns={ruleColumns}
              dataSource={riskRules}
              scroll={{ x: 1400 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
            />
          </Card>

          <Card className="shadow-sm" title="规则类型说明">
            <Row gutter={[16, 16]}>
              {Object.entries(ruleTypeMeta).map(([key, meta]) => (
                <Col span={8} key={key}>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      {meta.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 flex items-center gap-2">
                        {meta.label}
                        <Tag color={meta.color}>{key}</Tag>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{meta.desc}</div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </>
      )}

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-orange-500" />
            <span>批量催办</span>
          </div>
        }
        open={urgeModalVisible}
        onCancel={() => {
          setUrgeModalVisible(false);
          urgeForm.resetFields();
        }}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={urgeForm} layout="vertical" onFinish={handleUrgeSubmit}>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-orange-700">
              已选择 <strong className="text-orange-600">{selectedRowKeys.length}</strong> 条预警关联工单进行催办
            </p>
          </div>
          <Form.Item label="催办内容" name="content">
            <Input.TextArea
              rows={4}
              placeholder="请输入催办内容"
              defaultValue="请加快办理进度，确保按时办结"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit" icon={<Send size={14} />}>
                发送催办
              </Button>
              <Button
                onClick={() => {
                  setUrgeModalVisible(false);
                  urgeForm.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-500" />
            <span>{editingRule ? '编辑风险规则' : '新建风险规则'}</span>
          </div>
        }
        open={ruleModalVisible}
        onCancel={() => {
          setRuleModalVisible(false);
          setEditingRule(null);
        }}
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form form={ruleForm} layout="vertical" onFinish={handleRuleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="规则名称"
                name="name"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称，如：东城区临期预警" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="规则类型"
                name="type"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select
                  placeholder="请选择规则类型"
                  options={ruleTypeOptions}
                  disabled={!!editingRule}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                rules={[{ required: true, message: '请设置优先级' }]}
              >
                <InputNumber
                  min={1}
                  max={100}
                  style={{ width: '100%' }}
                  placeholder="1-100，数值越大优先级越高"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="启用状态"
                name="enabled"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={<Power size={12} />}
                  unCheckedChildren={<PowerOff size={12} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="规则描述" name="description">
            <Input.TextArea rows={2} placeholder="请输入规则描述（可选）" />
          </Form.Item>

          <Divider orientation="left" orientationMargin="0">阈值配置</Divider>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type') as RiskRuleType;
              return (
                <Row gutter={16}>
                  {type === 'expiring' && (
                    <Col span={12}>
                      <Form.Item
                        label="临期阈值（天）"
                        name="daysLeft"
                        rules={[{ required: true, message: '请输入临期阈值' }]}
                      >
                        <InputNumber
                          min={1}
                          max={30}
                          style={{ width: '100%' }}
                          placeholder="剩余多少天内触发预警"
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {type === 'multi_urge' && (
                    <Col span={12}>
                      <Form.Item
                        label="催办次数阈值"
                        name="urgeCount"
                        rules={[{ required: true, message: '请输入催办次数阈值' }]}
                      >
                        <InputNumber
                          min={1}
                          max={20}
                          style={{ width: '100%' }}
                          placeholder="催办达到多少次触发预警"
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {type === 'repeat_cluster' && (
                    <>
                      <Col span={12}>
                        <Form.Item
                          label="重复投诉次数阈值"
                          name="repeatCount"
                          rules={[{ required: true, message: '请输入重复次数阈值' }]}
                        >
                          <InputNumber
                            min={2}
                            max={50}
                            style={{ width: '100%' }}
                            placeholder="同一问题重复多少次触发预警"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="时间窗口（天）"
                          name="repeatDays"
                          rules={[{ required: true, message: '请输入时间窗口' }]}
                        >
                          <InputNumber
                            min={1}
                            max={90}
                            style={{ width: '100%' }}
                            placeholder="统计多少天内的重复投诉"
                          />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {type === 'low_satisfaction' && (
                    <Col span={12}>
                      <Form.Item
                        label="满意度阈值（低于）"
                        name="satisfactionBelow"
                        rules={[{ required: true, message: '请输入满意度阈值' }]}
                      >
                        <InputNumber
                          min={1}
                          max={5}
                          step={0.5}
                          style={{ width: '100%' }}
                          placeholder="满意度低于该值触发预警"
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {type === 'overdue' && (
                    <Col span={24}>
                      <Alert
                        type="info"
                        showIcon
                        message="超期预警无需额外阈值配置"
                        description="只要工单超过办理时限且未办结，就会自动触发预警。"
                      />
                    </Col>
                  )}
                </Row>
              );
            }}
          </Form.Item>

          <Divider orientation="left" orientationMargin="0">适用范围</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="范围类型"
                name="scopeType"
                rules={[{ required: true, message: '请选择范围类型' }]}
              >
                <Select
                  placeholder="请选择适用范围"
                  options={Object.entries(scopeTypeMeta).map(([value, meta]) => ({
                    label: (
                      <span className="flex items-center gap-2">
                        {meta.icon}
                        {meta.label}
                      </span>
                    ),
                    value,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scopeType !== cur.scopeType}>
            {({ getFieldValue }) => {
              const scopeType = getFieldValue('scopeType') as RiskRuleScope;
              return (
                <Row gutter={16}>
                  {scopeType === 'department' && (
                    <Col span={24}>
                      <Form.Item
                        label="适用部门"
                        name="departmentIds"
                        rules={[{ required: true, message: '请选择至少一个部门' }]}
                      >
                        <Select
                          mode="multiple"
                          placeholder="请选择适用的部门"
                          style={{ width: '100%' }}
                          showSearch
                          optionFilterProp="children"
                          options={departments.map((d) => ({ label: d.name, value: d.id }))}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {scopeType === 'area' && (
                    <Col span={24}>
                      <Form.Item
                        label="适用区域"
                        name="areaIds"
                        rules={[{ required: true, message: '请选择至少一个区域' }]}
                      >
                        <Select
                          mode="multiple"
                          placeholder="请选择适用的区域"
                          style={{ width: '100%' }}
                          options={areas.map((a) => ({ label: a.name, value: a.id }))}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  {scopeType === 'category' && (
                    <Col span={24}>
                      <Form.Item
                        label="适用分类"
                        name="categoryIds"
                        rules={[{ required: true, message: '请选择至少一个分类' }]}
                      >
                        <Select
                          mode="multiple"
                          placeholder="请选择适用的投诉分类"
                          style={{ width: '100%' }}
                          showSearch
                          optionFilterProp="children"
                        >
                          {parentCategories.map((cat) => (
                            <Select.OptGroup key={cat.id} label={cat.name}>
                              {categories
                                .filter((c) => c.parentId === cat.id)
                                .map((sub) => (
                                  <Select.Option key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </Select.Option>
                                ))}
                            </Select.OptGroup>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  )}
                  {scopeType === 'all' && (
                    <Col span={24}>
                      <Alert
                        type="info"
                        showIcon
                        message="全部范围"
                        description="该规则将对所有工单生效。"
                      />
                    </Col>
                  )}
                </Row>
              );
            }}
          </Form.Item>

          <Form.Item className="!mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRule ? '保存修改' : '创建规则'}
              </Button>
              <Button
                onClick={() => {
                  setRuleModalVisible(false);
                  setEditingRule(null);
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            <span>处理预警</span>
          </div>
        }
        open={handleModalVisible}
        onCancel={() => {
          setHandleModalVisible(false);
          setCurrentWarning(null);
        }}
        footer={null}
        width={480}
        destroyOnClose
      >
        {currentWarning && (
          <Form form={handleForm} layout="vertical" onFinish={handleHandleSubmit}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 space-y-2">
              <div className="flex items-center gap-2">
                {ruleTypeMeta[currentWarning.ruleType].icon}
                <span className="font-medium text-blue-800">{currentWarning.ruleName}</span>
                {getRiskTag(currentWarning.riskLevel)}
              </div>
              <div className="text-sm text-blue-700">
                关联工单：<span className="font-mono">{currentWarning.complaintId}</span> -{' '}
                {currentWarning.complaintTitle}
              </div>
              <div className="text-xs text-blue-500">
                触发时间：{currentWarning.triggeredAt}
              </div>
            </div>

            <Form.Item
              label="处理状态"
              name="status"
              rules={[{ required: true, message: '请选择处理状态' }]}
            >
              <Select
                options={[
                  { label: '处理中', value: 'processing' },
                  { label: '已处理', value: 'handled' },
                  { label: '忽略', value: 'ignored' },
                ]}
              />
            </Form.Item>

            <Form.Item label="处理备注" name="remark">
              <Input.TextArea rows={3} placeholder="请输入处理备注（可选）" />
            </Form.Item>

            <Form.Item className="!mb-0">
              <Space>
                <Button type="primary" htmlType="submit">
                  确认处理
                </Button>
                <Button
                  onClick={() => {
                    setHandleModalVisible(false);
                    setCurrentWarning(null);
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

export default WarningCenter;
