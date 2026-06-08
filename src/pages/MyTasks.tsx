import { useState } from 'react';
import { Card, Tabs, Table, Button, Tag, Space, Modal, Form, Input, Select, message } from 'antd';
import { ListTodo, Clock, AlertTriangle, MessageSquare, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { Complaint } from '@/types';
import { StatusTag, SourceTag } from '@/components/StatusTags';

const MyTasks: React.FC = () => {
  const navigate = useNavigate();
  const { complaints, updateComplaint, addTimeline } = useAppStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [form] = Form.useForm();

  const pendingList = complaints.filter(
    (c) => c.status === 'processing' || c.status === 'returned' || c.status === 'pending_assign'
  );

  const reviewList = complaints.filter((c) => c.status === 'pending_review');

  const completedList = complaints.filter((c) => c.status === 'completed');

  const overdueList = complaints.filter(
    (c) =>
      (c.status === 'processing' || c.status === 'returned') &&
      dayjs().isAfter(dayjs(c.deadline))
  );

  const getColumns = (showActions: boolean = true): ColumnsType<Complaint> => [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 120,
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
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
      width: 140,
      ellipsis: true,
    },
    {
      title: '区域',
      dataIndex: 'areaName',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status, record) => {
        const isOverdue =
          dayjs().isAfter(dayjs(record.deadline)) && record.status !== 'completed';
        return (
          <Space direction="vertical" size={2}>
            <StatusTag status={status} />
            {isOverdue && <Tag color="red">已超期</Tag>}
          </Space>
        );
      },
    },
    {
      title: '受理时间',
      dataIndex: 'createdAt',
      width: 160,
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      width: 160,
      render: (deadline, record) => {
        const isOverdue =
          dayjs().isAfter(dayjs(deadline)) && record.status !== 'completed';
        const daysLeft = dayjs(deadline).diff(dayjs(), 'day');
        return (
          <div>
            <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-600'}>
              {deadline}
            </span>
            <div className="text-xs mt-0.5">
              {isOverdue ? (
                <span className="text-red-500">已超期{Math.abs(daysLeft)}天</span>
              ) : (
                <span className="text-gray-400">
                  剩余 {daysLeft} 天 {dayjs(deadline).diff(dayjs(), 'hour') % 24} 小时
                </span>
              )}
            </div>
          </div>
        );
      },
      sorter: (a, b) => dayjs(a.deadline).valueOf() - dayjs(b.deadline).valueOf(),
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
          {showActions &&
            (record.status === 'processing' || record.status === 'returned') && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<MessageSquare size={14} />}
                  onClick={() => openProcessModal(record)}
                >
                  办理
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<Clock size={14} />}
                  onClick={() => openDelayModal(record)}
                >
                  延期
                </Button>
              </>
            )}
        </Space>
      ),
    },
  ];

  const openProcessModal = (record: Complaint) => {
    setSelectedComplaint(record);
    setProcessModalVisible(true);
  };

  const openDelayModal = (record: Complaint) => {
    setSelectedComplaint(record);
    setDelayModalVisible(true);
  };

  const handleProcess = (values: any) => {
    if (!selectedComplaint) return;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(selectedComplaint.id, {
      id: `${selectedComplaint.id}-process-${Date.now()}`,
      complaintId: selectedComplaint.id,
      type: 'process',
      operator: '责任单位经办人',
      content: values.content,
      createdAt: now,
    });
    updateComplaint(selectedComplaint.id, { status: 'pending_review' });
    message.success('办理结果已提交');
    setProcessModalVisible(false);
    form.resetFields();
  };

  const handleDelay = (values: any) => {
    if (!selectedComplaint) return;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(selectedComplaint.id, {
      id: `${selectedComplaint.id}-delay-${Date.now()}`,
      complaintId: selectedComplaint.id,
      type: 'delay',
      operator: '责任单位经办人',
      content: `申请延期 ${values.days} 天，原因：${values.reason}`,
      createdAt: now,
    });
    message.success('延期申请已提交，等待审批');
    setDelayModalVisible(false);
    form.resetFields();
  };

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span className="flex items-center gap-2">
          <ListTodo size={16} />
          待办理
          <Tag color="blue" className="ml-1">
            {pendingList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns(true)}
          dataSource={pendingList}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'review',
      label: (
        <span className="flex items-center gap-2">
          <Clock size={16} />
          待审核
          <Tag color="orange" className="ml-1">
            {reviewList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns(false)}
          dataSource={reviewList}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'overdue',
      label: (
        <span className="flex items-center gap-2">
          <AlertTriangle size={16} />
          已超期
          <Tag color="red" className="ml-1">
            {overdueList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns(true)}
          dataSource={overdueList}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'completed',
      label: (
        <span className="flex items-center gap-2">
          <MessageSquare size={16} />
          已办结
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns(false)}
          dataSource={completedList}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="shadow-sm" styles={{ body: { padding: '12px 24px 0' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      <Modal
        title="提交办理结果"
        open={processModalVisible}
        onCancel={() => setProcessModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleProcess}>
          <Form.Item
            label="办理结果"
            name="content"
            rules={[{ required: true, message: '请输入办理结果' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="请详细描述办理过程、处理措施和最终结果"
            />
          </Form.Item>
          <Form.Item label="附件" name="files">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 hover:border-blue-300 transition-colors cursor-pointer">
              <p className="text-sm">点击或拖拽文件到此处上传</p>
              <p className="text-xs mt-1">支持图片、PDF、Word等格式</p>
            </div>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交办理结果
              </Button>
              <Button onClick={() => setProcessModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="申请延期"
        open={delayModalVisible}
        onCancel={() => setDelayModalVisible(false)}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleDelay}>
          <Form.Item
            label="延期天数"
            name="days"
            rules={[{ required: true, message: '请选择延期天数' }]}
          >
            <Select placeholder="请选择延期天数">
              <Select.Option value={3}>3 天</Select.Option>
              <Select.Option value={5}>5 天</Select.Option>
              <Select.Option value={7}>7 天</Select.Option>
              <Select.Option value={10}>10 天</Select.Option>
              <Select.Option value={15}>15 天</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="延期原因"
            name="reason"
            rules={[{ required: true, message: '请输入延期原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细说明延期原因" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交申请
              </Button>
              <Button onClick={() => setDelayModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyTasks;
