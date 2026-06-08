import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AlertTriangle, Bell, Clock, Eye, Filter, RotateCcw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import type { Complaint } from '@/types';
import { areas, departments } from '@/data/dictionaries';
import { StatusTag } from '@/components/StatusTags';

type WarningTab = 'all' | 'expiring' | 'overdue' | 'multiUrge' | 'delayPending';
type RiskLevel = 'high' | 'medium' | 'low';
type TimeRange = 'today' | '3days' | '7days' | 'overdue7';

interface WarningItem {
  key: string;
  complaint: Complaint;
  warningType: WarningTab;
  warningLabel: string;
  riskLevel: RiskLevel;
  remainingHours: number;
  extensionRequestId?: string;
}

const tabLabels: Record<WarningTab, string> = {
  all: '全部预警',
  expiring: '即将到期',
  overdue: '已超期',
  multiUrge: '多次催办',
  delayPending: '延期待审批',
};

const riskMeta: Record<RiskLevel, { label: string; color: string }> = {
  high: { label: '高风险', color: 'red' },
  medium: { label: '中风险', color: 'orange' },
  low: { label: '低风险', color: 'green' },
};

const validTabs: WarningTab[] = ['all', 'expiring', 'overdue', 'multiUrge', 'delayPending'];

const getRiskLevel = (
  complaint: Complaint,
  remainingHours: number,
  warningType: WarningTab
): RiskLevel => {
  if (warningType === 'overdue' || complaint.status === 'overdue') return 'high';
  if ((complaint.urgeCount || 0) >= 3) return 'high';
  if (remainingHours <= 24 || warningType === 'delayPending') return 'medium';
  return 'low';
};

const matchesTimeRange = (item: WarningItem, timeRange?: TimeRange) => {
  if (!timeRange) return true;
  if (timeRange === 'today') return item.remainingHours >= 0 && item.remainingHours <= 24;
  if (timeRange === '3days') return item.remainingHours >= 0 && item.remainingHours <= 72;
  if (timeRange === '7days') return item.remainingHours >= 0 && item.remainingHours <= 168;
  return item.remainingHours < -168;
};

const WarningCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    complaints,
    extensionRequests,
    addTimeline,
    updateComplaint,
  } = useAppStore();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [urgeContent, setUrgeContent] = useState('请加快办理进度，确保按时办结');

  const activeTab = validTabs.includes(searchParams.get('tab') as WarningTab)
    ? (searchParams.get('tab') as WarningTab)
    : 'all';
  const filters = {
    departmentId: searchParams.get('departmentId') || undefined,
    areaId: searchParams.get('areaId') || undefined,
    riskLevel: (searchParams.get('riskLevel') as RiskLevel | null) || undefined,
    timeRange: (searchParams.get('timeRange') as TimeRange | null) || undefined,
  };

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSelectedRowKeys([]);
    setSearchParams(next);
  };

  const warningItems = useMemo<WarningItem[]>(() => {
    const now = dayjs();
    const openComplaints = complaints.filter((complaint) => complaint.status !== 'completed');
    const items: WarningItem[] = [];
    const pushItem = (complaint: Complaint, warningType: WarningTab, extensionRequestId?: string) => {
      const remainingHours = dayjs(complaint.deadline).diff(now, 'hour');
      items.push({
        key: `${warningType}-${complaint.id}${extensionRequestId ? `-${extensionRequestId}` : ''}`,
        complaint,
        warningType,
        warningLabel: tabLabels[warningType],
        riskLevel: getRiskLevel(complaint, remainingHours, warningType),
        remainingHours,
        extensionRequestId,
      });
    };

    openComplaints.forEach((complaint) => {
      const remainingHours = dayjs(complaint.deadline).diff(now, 'hour');
      if (remainingHours >= 0 && remainingHours <= 72) {
        pushItem(complaint, 'expiring');
      }
      if (remainingHours < 0 || complaint.status === 'overdue') {
        pushItem(complaint, 'overdue');
      }
      if ((complaint.urgeCount || 0) >= 2) {
        pushItem(complaint, 'multiUrge');
      }
    });

    extensionRequests
      .filter((request) => request.status === 'pending')
      .forEach((request) => {
        const complaint = complaints.find((item) => item.id === request.complaintId);
        if (complaint && complaint.status !== 'completed') {
          pushItem(complaint, 'delayPending', request.id);
        }
      });

    return items;
  }, [complaints, extensionRequests]);

  const tabItems = useMemo(
    () =>
      validTabs.map((tab) => ({
        key: tab,
        label: `${tabLabels[tab]} ${tab === 'all'
          ? warningItems.length
          : warningItems.filter((item) => item.warningType === tab).length}`,
      })),
    [warningItems]
  );

  const filteredItems = warningItems.filter((item) => {
    if (activeTab !== 'all' && item.warningType !== activeTab) return false;
    if (filters.departmentId && item.complaint.departmentId !== filters.departmentId) return false;
    if (filters.areaId && item.complaint.areaId !== filters.areaId) return false;
    if (filters.riskLevel && item.riskLevel !== filters.riskLevel) return false;
    if (!matchesTimeRange(item, filters.timeRange)) return false;
    return true;
  });

  const selectedItems = filteredItems.filter((item) => selectedRowKeys.includes(item.key));

  const warningStats = {
    expiring: warningItems.filter((item) => item.warningType === 'expiring').length,
    overdue: warningItems.filter((item) => item.warningType === 'overdue').length,
    multiUrge: warningItems.filter((item) => item.warningType === 'multiUrge').length,
    delayPending: warningItems.filter((item) => item.warningType === 'delayPending').length,
  };

  const handleBatchUrge = () => {
    const uniqueComplaints = Array.from(
      new Map(selectedItems.map((item) => [item.complaint.id, item.complaint])).values()
    );

    if (!uniqueComplaints.length) {
      message.warning('请先选择需要催办的工单');
      return;
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    uniqueComplaints.forEach((complaint) => {
      const current = useAppStore.getState().getComplaintById(complaint.id);
      addTimeline(complaint.id, {
        id: `${complaint.id}-batch-urge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        complaintId: complaint.id,
        type: 'urge',
        operator: '预警中心批量催办',
        content: `批量催办：${urgeContent || '请加快办理进度，确保按时办结'}`,
        createdAt: now,
      });
      updateComplaint(complaint.id, {
        urgeCount: (current?.urgeCount || 0) + 1,
      });
    });

    message.success(`已批量催办 ${uniqueComplaints.length} 个工单`);
    setSelectedRowKeys([]);
    setUrgeModalVisible(false);
    setUrgeContent('请加快办理进度，确保按时办结');
  };

  const columns: ColumnsType<WarningItem> = [
    {
      title: '预警类型',
      dataIndex: 'warningType',
      width: 110,
      render: (_, record) => {
        const colorMap: Record<WarningTab, string> = {
          all: 'default',
          expiring: 'gold',
          overdue: 'red',
          multiUrge: 'orange',
          delayPending: 'purple',
        };
        return <Tag color={colorMap[record.warningType]}>{record.warningLabel}</Tag>;
      },
    },
    {
      title: '工单编号',
      dataIndex: ['complaint', 'id'],
      width: 110,
      render: (id: string) => <span className="font-mono text-blue-600">{id}</span>,
    },
    {
      title: '标题',
      dataIndex: ['complaint', 'title'],
      width: 220,
      ellipsis: true,
    },
    {
      title: '责任单位',
      dataIndex: ['complaint', 'departmentName'],
      width: 150,
      ellipsis: true,
    },
    {
      title: '区域',
      dataIndex: ['complaint', 'areaName'],
      width: 100,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 100,
      render: (riskLevel: RiskLevel) => (
        <Tag color={riskMeta[riskLevel].color}>{riskMeta[riskLevel].label}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: ['complaint', 'status'],
      width: 100,
      render: (_, record) => <StatusTag status={record.complaint.status} />,
    },
    {
      title: '剩余时间',
      dataIndex: 'remainingHours',
      width: 140,
      sorter: (a, b) => a.remainingHours - b.remainingHours,
      render: (hours: number) => {
        if (hours < 0) return <span className="text-red-600">已超期 {Math.abs(hours)} 小时</span>;
        if (hours <= 24) return <span className="text-orange-600">剩余 {hours} 小时</span>;
        return <span className="text-gray-600">剩余 {Math.floor(hours / 24)} 天</span>;
      },
    },
    {
      title: '催办次数',
      dataIndex: ['complaint', 'urgeCount'],
      width: 100,
      render: (count?: number) => (
        count ? <Tag color="orange">{count} 次</Tag> : <span className="text-gray-400">0 次</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => navigate(`/complaints/${record.complaint.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic title="即将到期" value={warningStats.expiring} prefix={<Clock size={18} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic title="已超期" value={warningStats.overdue} prefix={<AlertTriangle size={18} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic title="多次催办" value={warningStats.multiUrge} prefix={<Bell size={18} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic title="延期待审批" value={warningStats.delayPending} prefix={<Filter size={18} />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          items={tabItems}
          onChange={(tab) => updateParams({ tab: tab === 'all' ? undefined : tab })}
        />

        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="责任单位"
              value={filters.departmentId}
              options={departments.map((department) => ({
                label: department.name,
                value: department.id,
              }))}
              style={{ width: '100%' }}
              onChange={(value) => updateParams({ departmentId: value })}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              allowClear
              placeholder="区域"
              value={filters.areaId}
              options={areas.map((area) => ({ label: area.name, value: area.id }))}
              style={{ width: '100%' }}
              onChange={(value) => updateParams({ areaId: value })}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              allowClear
              placeholder="风险等级"
              value={filters.riskLevel}
              options={[
                { label: '高风险', value: 'high' },
                { label: '中风险', value: 'medium' },
                { label: '低风险', value: 'low' },
              ]}
              style={{ width: '100%' }}
              onChange={(value) => updateParams({ riskLevel: value })}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              allowClear
              placeholder="剩余时间"
              value={filters.timeRange}
              options={[
                { label: '24小时内', value: 'today' },
                { label: '3天内', value: '3days' },
                { label: '7天内', value: '7days' },
                { label: '超期7天以上', value: 'overdue7' },
              ]}
              style={{ width: '100%' }}
              onChange={(value) => updateParams({ timeRange: value })}
            />
          </Col>
          <Col xs={24} md={3}>
            <Button
              icon={<RotateCcw size={14} />}
              onClick={() =>
                setSearchParams(activeTab === 'all' ? {} : { tab: activeTab })
              }
              block
            >
              重置
            </Button>
          </Col>
        </Row>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">
            已筛出 {filteredItems.length} 条预警，已选择 {selectedRowKeys.length} 条
          </span>
          <Space>
            <Button
              type="primary"
              icon={<Bell size={14} />}
              disabled={!selectedRowKeys.length}
              onClick={() => setUrgeModalVisible(true)}
            >
              批量催办
            </Button>
          </Space>
        </div>

        <Table
          rowKey="key"
          columns={columns}
          dataSource={filteredItems}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="批量催办"
        open={urgeModalVisible}
        onCancel={() => setUrgeModalVisible(false)}
        onOk={handleBatchUrge}
        okText="发送催办"
        cancelText="取消"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            将向选中的 {new Set(selectedItems.map((item) => item.complaint.id)).size} 个工单同步写入催办次数和办理时间线。
          </p>
          <Input.TextArea
            rows={4}
            value={urgeContent}
            onChange={(event) => setUrgeContent(event.target.value)}
            placeholder="请输入催办内容"
          />
        </div>
      </Modal>
    </div>
  );
};

export default WarningCenter;
