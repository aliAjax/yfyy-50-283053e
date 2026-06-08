import { useState, useEffect } from 'react';
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
} from 'antd';
import {
  AlertTriangle,
  Clock,
  Bell,
  Clock4,
  Eye,
  Send,
  Filter,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { Complaint, ExtensionRequest } from '@/types';
import { StatusTag, SourceTag } from '@/components/StatusTags';
import { areas, departments } from '@/data/dictionaries';

type RiskLevel = 'high' | 'medium' | 'low';
type TabKey = 'expiring' | 'overdue' | 'multiUrge' | 'delayPending';

const WarningCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { complaints, extensionRequests, batchUrge } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('expiring');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [urgeForm] = Form.useForm();
  const [filters, setFilters] = useState({
    departmentId: undefined as string | undefined,
    areaId: undefined as string | undefined,
    riskLevel: undefined as RiskLevel | undefined,
    timeRange: undefined as string | undefined,
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    const dept = searchParams.get('departmentId');
    const area = searchParams.get('areaId');
    const risk = searchParams.get('riskLevel');
    const time = searchParams.get('timeRange');

    if (tab && ['expiring', 'overdue', 'multiUrge', 'delayPending'].includes(tab)) {
      setActiveTab(tab as TabKey);
    }
    if (dept) setFilters((f) => ({ ...f, departmentId: dept }));
    if (area) setFilters((f) => ({ ...f, areaId: area }));
    if (risk && ['high', 'medium', 'low'].includes(risk)) {
      setFilters((f) => ({ ...f, riskLevel: risk as RiskLevel }));
    }
    if (time) setFilters((f) => ({ ...f, timeRange: time }));
  }, [searchParams]);

  const getRiskLevel = (complaint: Complaint): RiskLevel => {
    const isOverdue = dayjs().isAfter(dayjs(complaint.deadline)) && complaint.status !== 'completed';
    const daysLeft = dayjs(complaint.deadline).diff(dayjs(), 'day');
    const urgeCount = complaint.urgeCount || 0;

    if (isOverdue || urgeCount >= 3 || daysLeft < 0) {
      return 'high';
    }
    if (daysLeft <= 1 || urgeCount >= 2) {
      return 'medium';
    }
    return 'low';
  };

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
    const level = getRiskLevel(complaint);
    if (level === 'high') return '#ff4d4f';
    if (level === 'medium') return '#faad14';
    return '#52c41a';
  };

  const expiringList = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    const daysLeft = dayjs(c.deadline).diff(dayjs(), 'day');
    return daysLeft >= 0 && daysLeft <= 2;
  });

  const overdueList = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    return dayjs().isAfter(dayjs(c.deadline));
  });

  const multiUrgeList = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    return (c.urgeCount || 0) >= 2;
  });

  const delayPendingList = extensionRequests.filter((r) => r.status === 'pending');

  const applyFilters = <T extends Complaint | ExtensionRequest>(
    list: T[],
    type: TabKey
  ): T[] => {
    return list.filter((item) => {
      const complaint = item as Complaint;
      const extRequest = item as ExtensionRequest;

      if (type === 'delayPending') {
        if (filters.departmentId) {
          const complaintData = complaints.find((c) => c.id === extRequest.complaintId);
          if (complaintData?.departmentId !== filters.departmentId) return false;
        }
        if (filters.areaId) {
          const complaintData = complaints.find((c) => c.id === extRequest.complaintId);
          if (complaintData?.areaId !== filters.areaId) return false;
        }
      } else {
        if (filters.departmentId && complaint.departmentId !== filters.departmentId) {
          return false;
        }
        if (filters.areaId && complaint.areaId !== filters.areaId) {
          return false;
        }
        if (filters.riskLevel && getRiskLevel(complaint) !== filters.riskLevel) {
          return false;
        }
        if (filters.timeRange) {
          const daysLeft = dayjs(complaint.deadline).diff(dayjs(), 'day');
          switch (filters.timeRange) {
            case 'today':
              return daysLeft < 1;
            case '3days':
              return daysLeft <= 3;
            case '7days':
              return daysLeft <= 7;
            case 'overdue7':
              return daysLeft < -7;
            default:
              return true;
          }
        }
      }
      return true;
    });
  };

  const filteredExpiring = applyFilters(expiringList, 'expiring');
  const filteredOverdue = applyFilters(overdueList, 'overdue');
  const filteredMultiUrge = applyFilters(multiUrgeList, 'multiUrge');
  const filteredDelayPending = applyFilters(delayPendingList, 'delayPending');

  const complaintColumns: ColumnsType<Complaint> = [
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
      width: 240,
      ellipsis: true,
      render: (title) => <span className="text-gray-800">{title}</span>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (source) => <SourceTag source={source} />,
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
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 100,
      render: (_, record) => getRiskTag(getRiskLevel(record)),
    },
    {
      title: '办理进度',
      dataIndex: 'progress',
      width: 140,
      render: (_, record) => (
        <Progress
          percent={Math.round(getProgressPercent(record))}
          strokeColor={getProgressColor(record)}
          size="small"
          showInfo={false}
        />
      ),
    },
    {
      title: '时限情况',
      dataIndex: 'deadline',
      width: 180,
      render: (deadline, record) => {
        const isOverdue = dayjs().isAfter(dayjs(deadline)) && record.status !== 'completed';
        const daysLeft = dayjs(deadline).diff(dayjs(), 'day');
        const hoursLeft = dayjs(deadline).diff(dayjs(), 'hour') % 24;
        return (
          <div>
            <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-600'}>
              {deadline}
            </span>
            <div className="text-xs mt-0.5">
              {isOverdue ? (
                <Tag color="red">已超期{Math.abs(daysLeft)}天</Tag>
              ) : daysLeft === 0 ? (
                <Tag color="orange">剩余 {hoursLeft} 小时</Tag>
              ) : (
                <Tag color="green">剩余 {daysLeft} 天</Tag>
              )}
            </div>
          </div>
        );
      },
      sorter: (a, b) => dayjs(a.deadline).valueOf() - dayjs(b.deadline).valueOf(),
    },
    {
      title: '催办次数',
      dataIndex: 'urgeCount',
      width: 100,
      render: (count) =>
        count > 0 ? (
          <Tag color="orange" icon={<Bell size={10} />}>
            {count} 次
          </Tag>
        ) : (
          <span className="text-gray-400">0 次</span>
        ),
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
            onClick={() => navigate(`/complaints/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<Bell size={14} />}
            onClick={() => handleSingleUrge(record.id)}
          >
            催办
          </Button>
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
    const ids = selectedRowKeys.map((key) => String(key));
    batchUrge(ids, values.content);
    message.success(`已向 ${ids.length} 条工单发送催办通知`);
    setUrgeModalVisible(false);
    setSelectedRowKeys([]);
    urgeForm.resetFields();
  };

  const resetFilters = () => {
    setFilters({
      departmentId: undefined,
      areaId: undefined,
      riskLevel: undefined,
      timeRange: undefined,
    });
    setSearchParams({ tab: activeTab });
  };

  const handleFilterChange = (key: keyof typeof filters, value: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: value }));
    const params = new URLSearchParams(searchParams);
    params.set('tab', activeTab);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    setSelectedRowKeys([]);
    const params = new URLSearchParams(searchParams);
    params.set('tab', key);
    setSearchParams(params);
  };

  const tabItems = [
    {
      key: 'expiring',
      label: (
        <span className="flex items-center gap-2">
          <Clock size={16} className="text-orange-500" />
          即将到期
          <Tag color="orange" className="ml-1">
            {expiringList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={complaintColumns}
          dataSource={filteredExpiring}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          rowSelection={
            activeTab === 'expiring'
              ? { selectedRowKeys, onChange: setSelectedRowKeys }
              : undefined
          }
        />
      ),
    },
    {
      key: 'overdue',
      label: (
        <span className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          已超期
          <Tag color="red" className="ml-1">
            {overdueList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={complaintColumns}
          dataSource={filteredOverdue}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          rowSelection={
            activeTab === 'overdue'
              ? { selectedRowKeys, onChange: setSelectedRowKeys }
              : undefined
          }
        />
      ),
    },
    {
      key: 'multiUrge',
      label: (
        <span className="flex items-center gap-2">
          <Bell size={16} className="text-purple-500" />
          多次催办
          <Tag color="purple" className="ml-1">
            {multiUrgeList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={complaintColumns}
          dataSource={filteredMultiUrge}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          rowSelection={
            activeTab === 'multiUrge'
              ? { selectedRowKeys, onChange: setSelectedRowKeys }
              : undefined
          }
        />
      ),
    },
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
      children: (
        <Table
          rowKey="id"
          columns={delayColumns}
          dataSource={filteredDelayPending}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
  ];

  const showBatchUrgeButton = activeTab !== 'delayPending' && selectedRowKeys.length > 0;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={5}>
            <Select
              placeholder="责任单位"
              allowClear
              style={{ width: '100%' }}
              value={filters.departmentId}
              onChange={(val) => handleFilterChange('departmentId', val)}
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
              value={filters.areaId}
              onChange={(val) => handleFilterChange('areaId', val)}
              options={areas.map((a) => ({ label: a.name, value: a.id }))}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="风险等级"
              allowClear
              style={{ width: '100%' }}
              value={filters.riskLevel}
              onChange={(val) => handleFilterChange('riskLevel', val)}
              options={[
                { label: '高风险', value: 'high' },
                { label: '中风险', value: 'medium' },
                { label: '低风险', value: 'low' },
              ]}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="剩余时间"
              allowClear
              style={{ width: '100%' }}
              value={filters.timeRange}
              onChange={(val) => handleFilterChange('timeRange', val)}
              options={[
                { label: '今日到期', value: 'today' },
                { label: '3天内', value: '3days' },
                { label: '7天内', value: '7days' },
                { label: '超期7天以上', value: 'overdue7' },
              ]}
            />
          </Col>
          <Col span={3}>
            <Space>
              <Button icon={<Filter size={16} />} onClick={resetFilters}>
                重置
              </Button>
            </Space>
          </Col>
          <Col span={4}>
            {showBatchUrgeButton && (
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
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Card>

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
              已选择 <strong className="text-orange-600">{selectedRowKeys.length}</strong> 条工单进行催办
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
    </div>
  );
};

export default WarningCenter;
