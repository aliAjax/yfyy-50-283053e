import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  Row,
  Col,
  message,
  Tag,
  Alert,
  List,
  Progress,
  Empty,
} from 'antd';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Bell,
  Zap,
  User,
  Phone,
  MapPin,
  Building2,
  ClipboardList,
  GitMerge,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type {
  AssignSource,
  Complaint,
  ComplaintSource,
  ComplaintStatus,
  Department,
  DuplicateComplaintResult,
  PerformanceDrillDownType,
  TimelineRecord,
} from '@/types';
import { StatusTag, SourceTag, SatisfactionTag } from '@/components/StatusTags';
import { categories, areas, departments, statusMap, sourceMap, assignSourceMap, statusColorMap } from '@/data/dictionaries';
import type { DispatchMatchResult } from '@/lib/utils';
import { getSimilarityColor, getSimilarityLabel, getSimilarityLevel } from '@/lib/utils';

type ComplaintFilters = {
  keyword: string;
  source?: ComplaintSource;
  status?: ComplaintStatus;
  categoryId?: string;
  areaId?: string;
  departmentId?: string;
  isRepeat?: boolean;
  drillType?: PerformanceDrillDownType;
};

const defaultComplaintFilters: ComplaintFilters = {
  keyword: '',
  source: undefined,
  status: undefined,
  categoryId: undefined,
  areaId: undefined,
  departmentId: undefined,
  isRepeat: undefined,
  drillType: undefined,
};

const performanceDrillTypes: PerformanceDrillDownType[] = ['overdue', 'return', 'urge', 'low_satisfaction'];

const drillTypeLabelMap: Record<PerformanceDrillDownType, string> = {
  overdue: '超期工单',
  return: '退回工单',
  urge: '催办工单',
  low_satisfaction: '满意度偏低',
};

const getPerformanceDrillType = (value: string | null): PerformanceDrillDownType | undefined => {
  if (performanceDrillTypes.includes(value as PerformanceDrillDownType)) {
    return value as PerformanceDrillDownType;
  }
  return undefined;
};

const isComplaintOverdue = (complaint: Complaint) =>
  complaint.status === 'overdue' ||
  (complaint.status !== 'completed' && dayjs().isAfter(dayjs(complaint.deadline)));

const matchesPerformanceDrillFilter = (complaint: Complaint, drillType: PerformanceDrillDownType) => {
  switch (drillType) {
    case 'overdue':
      return isComplaintOverdue(complaint);
    case 'return':
      return complaint.timelines.some((timeline) => timeline.type === 'return');
    case 'urge':
      return (complaint.urgeCount || 0) > 0;
    case 'low_satisfaction':
      return complaint.satisfaction !== undefined && complaint.satisfaction < 3.5;
    default:
      return true;
  }
};

const ComplaintList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { complaints, updateComplaint, addTimeline, addComplaint, matchDispatch, detectDuplicates, mergeComplaint } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [matchResult, setMatchResult] = useState<DispatchMatchResult | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [assignSource, setAssignSource] = useState<AssignSource>('auto');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>();
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [currentComplaint, setCurrentComplaint] = useState<Complaint | null>(null);
  const [duplicateResults, setDuplicateResults] = useState<DuplicateComplaintResult[]>([]);
  const [submitDuplicateResults, setSubmitDuplicateResults] = useState<DuplicateComplaintResult[]>([]);
  const [showSubmitDuplicateModal, setShowSubmitDuplicateModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const [filters, setFilters] = useState<ComplaintFilters>(defaultComplaintFilters);
  const searchParamString = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    if (params.get('from') !== 'department-performance') {
      setFilters((prev) =>
        prev.drillType || prev.departmentId
          ? { ...prev, departmentId: undefined, drillType: undefined }
          : prev
      );
      return;
    }

    setFilters((prev) => ({
      ...prev,
      departmentId: params.get('departmentId') || undefined,
      drillType: getPerformanceDrillType(params.get('drillType')),
    }));
  }, [searchParamString]);

  const performanceSource = filters.drillType
    ? {
        drillLabel: drillTypeLabelMap[filters.drillType],
        departmentName: filters.departmentId
          ? departments.find((d) => d.id === filters.departmentId)?.name ||
            searchParams.get('departmentName') ||
            filters.departmentId
          : '全部责任单位',
      }
    : null;

  const filteredComplaints = complaints.filter((c) => {
    if (filters.keyword && !c.title.includes(filters.keyword) && !c.id.includes(filters.keyword)) {
      return false;
    }
    if (filters.source && c.source !== filters.source) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.categoryId && !c.categoryId.startsWith(filters.categoryId)) return false;
    if (filters.areaId && c.areaId !== filters.areaId) return false;
    if (filters.departmentId && c.departmentId !== filters.departmentId) return false;
    if (filters.drillType && !matchesPerformanceDrillFilter(c, filters.drillType)) return false;
    if (filters.isRepeat !== undefined && c.isRepeat !== filters.isRepeat) return false;
    return true;
  });

  const columns: ColumnsType<Complaint> = [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 120,
      fixed: 'left',
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 260,
      ellipsis: true,
      render: (title, record) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-gray-800 truncate">{title}</span>
          </div>
          {record.isRepeat && (
            <div className="mt-1">
              <Tag color="pink" className="m-0 text-xs" icon={<GitMerge size={10} />}>
                重复投诉 {record.repeatCount ? `(${record.repeatCount}件)` : ''}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (source) => <SourceTag source={source} />,
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '区域',
      dataIndex: 'areaName',
      width: 100,
    },
    {
      title: '责任单位',
      dataIndex: 'departmentName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction',
      width: 100,
      render: (score) => <SatisfactionTag score={score} />,
    },
    {
      title: '受理时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (time) => <span className="text-gray-500 text-sm">{time}</span>,
    },
    {
      title: '办理时限',
      dataIndex: 'deadline',
      width: 160,
      render: (deadline, record) => {
        const isOverdue = dayjs().isAfter(dayjs(deadline)) && record.status !== 'completed';
        const daysLeft = dayjs(deadline).diff(dayjs(), 'day');
        return (
          <div>
            <span className={isOverdue ? 'text-red-500' : 'text-gray-500'}>
              {deadline}
            </span>
            {record.status !== 'completed' && (
              <div className="text-xs mt-0.5">
                {isOverdue ? (
                  <span className="text-red-500">已超期{Math.abs(daysLeft)}天</span>
                ) : (
                  <span className="text-gray-400">剩余{daysLeft}天</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/complaints/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<GitMerge size={14} />}
            onClick={() => handleDuplicateCheck(record)}
          >
            研判
          </Button>
          {(record.status === 'processing' || record.status === 'pending_review') && (
            <Button
              type="link"
              size="small"
              danger
              icon={<Bell size={14} />}
              onClick={() => handleUrge(record.id)}
            >
              催办
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleUrge = (id: string) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(id, {
      id: `${id}-urge-${Date.now()}`,
      complaintId: id,
      type: 'urge',
      operator: '督办员',
      content: '督办催办：请加快办理进度',
      createdAt: now,
    });
    updateComplaint(id, { urgeCount: (useAppStore.getState().getComplaintById(id)?.urgeCount || 0) + 1 });
    message.success('催办通知已发送');
  };

  const handleDuplicateCheck = (complaint: Complaint) => {
    const results = detectDuplicates(
      {
        title: complaint.title,
        categoryId: complaint.categoryId,
        areaId: complaint.areaId,
        address: complaint.address,
        contactPhone: complaint.contactPhone,
      },
      complaint.id
    );
    setCurrentComplaint(complaint);
    setDuplicateResults(results);
    setDuplicateModalVisible(true);
  };

  const handleMerge = (targetId: string) => {
    if (!currentComplaint) return;
    Modal.confirm({
      title: '确认合并投诉',
      content: `确定要将投诉 ${currentComplaint.id} 合并到投诉 ${targetId} 吗？`,
      okText: '确认合并',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        mergeComplaint(currentComplaint.id, targetId, '督办员');
        message.success('投诉合并成功');
        setDuplicateModalVisible(false);
      },
    });
  };

  const resetFilters = () => {
    setFilters({ ...defaultComplaintFilters });
    setSearchParams({});
  };

  const clearPerformanceSource = () => {
    setFilters((prev) => ({
      ...prev,
      departmentId: undefined,
      drillType: undefined,
    }));
    setSearchParams({});
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  useEffect(() => {
    if (selectedCategoryId && selectedAreaId) {
      const result = matchDispatch(selectedCategoryId, selectedAreaId);
      setMatchResult(result);
      if (result.matched && result.rule) {
        form.setFieldsValue({ departmentId: result.rule.departmentId });
        setSelectedDept(departments.find(d => d.id === result.rule?.departmentId) || null);
        setAssignSource('auto');
      } else {
        setSelectedDept(null);
        setAssignSource('manual');
      }
    }
  }, [selectedCategoryId, selectedAreaId]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);
  };

  const handleAreaChange = (value: string) => {
    setSelectedAreaId(value);
  };

  const handleDeptChange = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    setSelectedDept(dept || null);
    setAssignSource('manual');
  };

  const doSubmit = (values: {
    title: string;
    categoryId: string;
    areaId: string;
    departmentId: string;
    content: string;
    contactName: string;
    contactPhone: string;
    address?: string;
  }) => {
    const now = dayjs();
    const newId = `C${String(complaints.length + 1).padStart(5, '0')}`;

    const category = categories.find((c) => c.id === values.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === values.areaId);
    const department = departments.find((d) => d.id === values.departmentId);

    const acceptTimeline: TimelineRecord = {
      id: `${newId}-t1`,
      complaintId: newId,
      type: 'accept',
      operator: '后台录入',
      content: '投诉已受理，等待派单',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    };

    const assignContent = assignSource === 'auto' && matchResult?.rule
      ? `根据派单规则「${matchResult.rule.name}」自动派单至${department?.name || '责任单位'}`
      : `人工派单至${department?.name || '责任单位'}`;

    const assignTimeline: TimelineRecord = {
      id: `${newId}-t2`,
      complaintId: newId,
      type: 'assign',
      operator: assignSource === 'auto' ? '智能派单系统' : '后台录入员',
      content: assignContent,
      createdAt: now.add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      assignSource,
    };

    const newComplaint: Complaint = {
      id: newId,
      title: values.title,
      content: values.content,
      source: 'backend',
      status: 'processing',
      categoryId: values.categoryId,
      categoryName: `${parentCategory?.name || ''} - ${category?.name || ''}`,
      areaId: values.areaId,
      areaName: area?.name || '',
      departmentId: values.departmentId,
      departmentName: department?.name || '',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
      deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      address: values.address,
      isRepeat: false,
      urgeCount: 0,
      timelines: [acceptTimeline, assignTimeline],
      assignSource,
      dispatchRuleId: matchResult?.rule?.id,
      dispatchRuleName: matchResult?.rule?.name,
    };

    addComplaint(newComplaint);
    message.success(assignSource === 'auto' ? '投诉已录入，系统已自动派单' : '投诉已录入');
    setIsModalVisible(false);
    form.resetFields();
    setMatchResult(null);
    setSelectedDept(null);
    setAssignSource('auto');
    setSelectedCategoryId(undefined);
    setSelectedAreaId(undefined);
    setPendingSubmitData(null);
    setSubmitDuplicateResults([]);
    setShowSubmitDuplicateModal(false);
  };

  const handleSubmit = (values: {
    title: string;
    categoryId: string;
    areaId: string;
    departmentId: string;
    content: string;
    contactName: string;
    contactPhone: string;
    address?: string;
  }) => {
    setCheckingDuplicates(true);

    const area = areas.find((a) => a.id === values.areaId);
    const category = categories.find((c) => c.id === values.categoryId);

    const duplicates = detectDuplicates(
      {
        title: values.title,
        areaId: values.areaId,
        categoryId: values.categoryId,
        address: values.address || '',
        contactPhone: values.contactPhone,
      },
      undefined
    );

    setCheckingDuplicates(false);

    if (duplicates.length > 0) {
      setSubmitDuplicateResults(duplicates);
      setPendingSubmitData(values);
      setShowSubmitDuplicateModal(true);
    } else {
      doSubmit(values);
    }
  };

  const handleMergeToComplaint = (targetComplaint: Complaint) => {
    if (!pendingSubmitData) return;

    const now = dayjs();
    const newId = `C${String(complaints.length + 1).padStart(5, '0')}`;

    const category = categories.find((c) => c.id === pendingSubmitData.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === pendingSubmitData.areaId);
    const department = departments.find((d) => d.id === pendingSubmitData.departmentId);

    const acceptTimeline: TimelineRecord = {
      id: `${newId}-t1`,
      complaintId: newId,
      type: 'accept',
      operator: '后台录入',
      content: '投诉已受理，等待派单',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
    };

    const assignContent = assignSource === 'auto' && matchResult?.rule
      ? `根据派单规则「${matchResult.rule.name}」自动派单至${department?.name || '责任单位'}`
      : `人工派单至${department?.name || '责任单位'}`;

    const assignTimeline: TimelineRecord = {
      id: `${newId}-t2`,
      complaintId: newId,
      type: 'assign',
      operator: assignSource === 'auto' ? '智能派单系统' : '后台录入员',
      content: assignContent,
      createdAt: now.add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      assignSource,
    };

    const newComplaint: Complaint = {
      id: newId,
      title: pendingSubmitData.title,
      content: pendingSubmitData.content,
      source: 'backend',
      status: 'processing',
      categoryId: pendingSubmitData.categoryId,
      categoryName: `${parentCategory?.name || ''} - ${category?.name || ''}`,
      areaId: pendingSubmitData.areaId,
      areaName: area?.name || '',
      departmentId: pendingSubmitData.departmentId,
      departmentName: department?.name || '',
      createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
      deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      contactName: pendingSubmitData.contactName,
      contactPhone: pendingSubmitData.contactPhone,
      address: pendingSubmitData.address,
      isRepeat: true,
      urgeCount: 0,
      timelines: [acceptTimeline, assignTimeline],
      assignSource,
      dispatchRuleId: matchResult?.rule?.id,
      dispatchRuleName: matchResult?.rule?.name,
    };

    addComplaint(newComplaint);
    mergeComplaint(newId, targetComplaint.id, '后台录入');
    message.success(`已合并到投诉 ${targetComplaint.id}`);

    setIsModalVisible(false);
    form.resetFields();
    setMatchResult(null);
    setSelectedDept(null);
    setAssignSource('auto');
    setSelectedCategoryId(undefined);
    setSelectedAreaId(undefined);
    setPendingSubmitData(null);
    setSubmitDuplicateResults([]);
    setShowSubmitDuplicateModal(false);
  };

  const handleContinueSubmit = () => {
    if (pendingSubmitData) {
      doSubmit(pendingSubmitData);
    }
  };

  const getTypeTagColor = (type: string) => {
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

  return (
    <div className="space-y-4">
      {performanceSource && (
        <Alert
          type="info"
          showIcon
          message="来自部门绩效页"
          description={
            <Space size={[8, 8]} wrap>
              <Tag color="blue">责任单位：{performanceSource.departmentName}</Tag>
              <Tag color="orange">筛选：{performanceSource.drillLabel}</Tag>
              <span className="text-gray-500">当前列表已自动应用来源筛选条件</span>
            </Space>
          }
          action={
            <Space>
              <Button size="small" onClick={() => navigate('/department-performance')}>
                返回绩效页
              </Button>
              <Button size="small" onClick={clearPerformanceSource}>
                清除来源
              </Button>
            </Space>
          }
        />
      )}

      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col span={6}>
            <Input
              placeholder="搜索投诉编号或标题"
              prefix={<Search size={16} className="text-gray-400" />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              allowClear
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="来源"
              allowClear
              style={{ width: '100%' }}
              value={filters.source}
              onChange={(val) => setFilters({ ...filters, source: val })}
              options={Object.entries(sourceMap).map(([value, label]) => ({ label, value }))}
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val })}
              options={Object.entries(statusMap).map(([value, label]) => ({ label, value }))}
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="分类"
              allowClear
              style={{ width: '100%' }}
              value={filters.categoryId}
              onChange={(val) => setFilters({ ...filters, categoryId: val })}
              options={parentCategories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="区域"
              allowClear
              style={{ width: '100%' }}
              value={filters.areaId}
              onChange={(val) => setFilters({ ...filters, areaId: val })}
              options={areas.map((a) => ({ label: a.name, value: a.id }))}
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="重复投诉"
              allowClear
              style={{ width: '100%' }}
              value={filters.isRepeat}
              onChange={(val) => setFilters({ ...filters, isRepeat: val })}
              options={[
                { label: '是', value: true },
                { label: '否', value: false },
              ]}
            />
          </Col>
          <Col span={2}>
            <Space>
              <Button icon={<Filter size={16} />} onClick={resetFilters}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">投诉列表</span>
            <span className="text-sm text-gray-400">共 {filteredComplaints.length} 条</span>
          </div>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsModalVisible(true)}
          >
            后台录入
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredComplaints}
          scroll={{ x: 1400, y: 550 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
        />
      </div>

      <Modal
        title="后台录入投诉"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setMatchResult(null);
          setSelectedDept(null);
          setAssignSource('auto');
          setSelectedCategoryId(undefined);
          setSelectedAreaId(undefined);
          form.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="投诉标题"
                name="title"
                rules={[{ required: true, message: '请输入投诉标题' }]}
              >
                <Input placeholder="请输入投诉标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="事项分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择事项分类' }]}
              >
                <Select placeholder="请选择分类" onChange={handleCategoryChange}>
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
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="所属区域"
                name="areaId"
                rules={[{ required: true, message: '请选择所属区域' }]}
              >
                <Select placeholder="请选择区域" onChange={handleAreaChange}>
                  {areas.map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <span className="flex items-center gap-1">
                    责任单位
                    <Tag color={assignSource === 'auto' ? 'green' : 'orange'} className="ml-1">
                      {assignSource === 'auto' ? '智能匹配' : '人工选择'}
                    </Tag>
                  </span>
                }
                name="departmentId"
                rules={[{ required: true, message: '请选择责任单位' }]}
              >
                <Select
                  placeholder="请选择责任单位"
                  onChange={handleDeptChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {departments.map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {matchResult && matchResult.matched && matchResult.rule && (
            <Alert
              message={
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-green-500" />
                  <span>
                    智能匹配成功：根据「{matchResult.rule.name}」派单至 <strong>{matchResult.rule.departmentName}</strong>
                  </span>
                </div>
              }
              type="success"
              showIcon={false}
              className="mb-4"
            />
          )}

          {matchResult && !matchResult.matched && (
            <Alert
              message={
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-orange-500" />
                  <span>
                    未找到匹配的派单规则，请 <strong>人工选择</strong> 责任单位
                  </span>
                </div>
              }
              type="warning"
              showIcon={false}
              className="mb-4"
            />
          )}

          {selectedDept && (
            <div className="mb-4 p-4 bg-blue-50/60 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={22} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800">
                    {selectedDept.name}
                  </div>
                  <Tag color={getTypeTagColor(selectedDept.type)} className="m-0 mt-1">
                    {selectedDept.type}
                  </Tag>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {selectedDept.contact && (
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">联系人：{selectedDept.contact}</span>
                  </div>
                )}
                {selectedDept.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="font-mono">电话：{selectedDept.phone}</span>
                  </div>
                )}
              </div>
              {selectedDept.address && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                  <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">地址：{selectedDept.address}</span>
                </div>
              )}
              {selectedDept.responsibilities && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                    <ClipboardList size={12} />
                    <span>主要职责</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedDept.responsibilities}
                  </p>
                </div>
              )}
            </div>
          )}
          <Form.Item
            label="投诉内容"
            name="content"
            rules={[{ required: true, message: '请输入投诉内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细描述投诉内容" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系人"
                name="contactName"
                rules={[{ required: true, message: '请输入联系人姓名' }]}
              >
                <Input placeholder="请输入联系人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="contactPhone"
                rules={[{ required: true, message: '请输入联系电话' }]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="详细地址" name="address">
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交录入
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                setMatchResult(null);
                setSelectedDept(null);
                setAssignSource('auto');
                form.resetFields();
              }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            <span>疑似重复投诉</span>
          </div>
        }
        open={showSubmitDuplicateModal}
        onCancel={() => {
          setShowSubmitDuplicateModal(false);
          setPendingSubmitData(null);
          setSubmitDuplicateResults([]);
        }}
        footer={null}
        width={720}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            showIcon
            icon={<AlertTriangle size={16} />}
            message={`检测到 ${submitDuplicateResults.length} 条疑似重复的投诉记录`}
            description="请确认是否合并到已有投诉，或继续创建新投诉。"
          />

          <div className="max-h-[400px] overflow-y-auto pr-1">
            <List
              dataSource={submitDuplicateResults}
              renderItem={(item) => {
                const level = getSimilarityLevel(item.similarity);
                const color = getSimilarityColor(item.similarity);
                const label = getSimilarityLabel(item.similarity);
                return (
                  <List.Item
                    key={item.complaint.id}
                    className="border border-gray-200 rounded-lg mb-3 hover:border-pink-300 hover:bg-pink-50/30 transition-colors"
                    style={{ padding: '14px' }}
                  >
                    <div className="w-full">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 truncate">
                              {item.complaint.title}
                            </span>
                            <Tag
                              color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'green'}
                              className="m-0 flex-shrink-0"
                            >
                              {label}
                            </Tag>
                            <Tag color={statusColorMap[item.complaint.status]} className="m-0 flex-shrink-0">
                              {statusMap[item.complaint.status]}
                            </Tag>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-blue-600">{item.complaint.id}</span>
                            <span>·</span>
                            <span>{item.complaint.areaName}</span>
                            <span>·</span>
                            <span>{item.complaint.categoryName}</span>
                            <span>·</span>
                            <span>{item.complaint.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-bold" style={{ color }}>
                            {Math.round(item.similarity * 100)}%
                          </div>
                          <div className="text-xs text-gray-400">相似度</div>
                        </div>
                      </div>

                      <Progress
                        percent={Math.round(item.similarity * 100)}
                        strokeColor={color}
                        size="small"
                        showInfo={false}
                        className="mb-2"
                      />

                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.matchReasons.map((reason, idx) => (
                          <Tag key={idx} color="blue" className="m-0 text-xs">
                            {reason}
                          </Tag>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          责任单位：{item.complaint.departmentName}
                        </div>
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<Eye size={14} />}
                            onClick={() => navigate(`/complaints/${item.complaint.id}`)}
                          >
                            查看详情
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            danger={level === 'high'}
                            icon={<GitMerge size={14} />}
                            onClick={() => handleMergeToComplaint(item.complaint)}
                          >
                            合并到此
                          </Button>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              确认没有相同投诉，继续创建？
            </div>
            <Space>
              <Button
                onClick={() => {
                  setShowSubmitDuplicateModal(false);
                  setPendingSubmitData(null);
                  setSubmitDuplicateResults([]);
                }}
              >
                取消
              </Button>
              <Button type="primary" icon={<Plus size={14} />} onClick={handleContinueSubmit}>
                继续创建新投诉
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <GitMerge size={20} className="text-pink-500" />
            <span>重复投诉研判</span>
          </div>
        }
        open={duplicateModalVisible}
        onCancel={() => {
          setDuplicateModalVisible(false);
          setCurrentComplaint(null);
          setDuplicateResults([]);
        }}
        footer={null}
        width={800}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        <div className="space-y-4">
          {currentComplaint && (
            <Alert
              type="info"
              showIcon
              icon={<AlertTriangle size={16} />}
              message={`当前投诉：${currentComplaint.id} - ${currentComplaint.title}`}
              description={`检测到 ${duplicateResults.length} 条疑似重复的投诉记录，可选择合并到已有投诉。`}
            />
          )}

          {duplicateResults.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto pr-1">
              <List
                dataSource={duplicateResults}
                renderItem={(item) => {
                  const level = getSimilarityLevel(item.similarity);
                  const color = getSimilarityColor(item.similarity);
                  const label = getSimilarityLabel(item.similarity);
                  return (
                    <List.Item
                      key={item.complaint.id}
                      className="border border-gray-200 rounded-lg mb-3 hover:border-pink-300 hover:bg-pink-50/30 transition-colors"
                      style={{ padding: '16px' }}
                    >
                      <div className="w-full">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800 truncate">
                                {item.complaint.title}
                              </span>
                              <Tag
                                color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'green'}
                                className="m-0 flex-shrink-0"
                              >
                                {label}
                              </Tag>
                              <Tag color={statusColorMap[item.complaint.status]} className="m-0 flex-shrink-0">
                                {statusMap[item.complaint.status]}
                              </Tag>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-blue-600">{item.complaint.id}</span>
                              <span>·</span>
                              <span>{item.complaint.areaName}</span>
                              <span>·</span>
                              <span>{item.complaint.categoryName}</span>
                              <span>·</span>
                              <span>{item.complaint.createdAt}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-lg font-bold" style={{ color }}>
                              {Math.round(item.similarity * 100)}%
                            </div>
                            <div className="text-xs text-gray-400">相似度</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <Progress
                            percent={Math.round(item.similarity * 100)}
                            strokeColor={color}
                            size="small"
                            showInfo={false}
                          />
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.matchReasons.map((reason, idx) => (
                            <Tag key={idx} color="blue" className="m-0 text-xs">
                              {reason}
                            </Tag>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            责任单位：{item.complaint.departmentName}
                          </div>
                          <Space>
                            <Button
                              size="small"
                              icon={<Eye size={14} />}
                              onClick={() => navigate(`/complaints/${item.complaint.id}`)}
                            >
                              查看详情
                            </Button>
                            <Button
                              type="primary"
                              size="small"
                              danger
                              icon={<GitMerge size={14} />}
                              onClick={() => handleMerge(item.complaint.id)}
                            >
                              合并到此
                            </Button>
                          </Space>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </div>
          ) : (
            <Empty description="未检测到疑似重复的投诉" />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ComplaintList;
