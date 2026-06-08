import { useState } from 'react';
import { Card, Tabs, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Rate } from 'antd';
import { ClipboardCheck, Clock, Bell, RotateCcw, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { Complaint } from '@/types';
import { StatusTag, SourceTag } from '@/components/StatusTags';

const Supervision: React.FC = () => {
  const navigate = useNavigate();
  const { complaints, updateComplaint, addTimeline } = useAppStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [form] = Form.useForm();

  const pendingList = complaints.filter(
    (c) => c.status === 'processing' || c.status === 'pending_assign'
  );

  const reviewList = complaints.filter((c) => c.status === 'pending_review');

  const delayList = complaints.filter(
    (c) => c.status === 'processing' || c.status === 'returned'
  );

  const completedList = complaints.filter((c) => c.status === 'completed');

  const getColumns = (type: string): ColumnsType<Complaint> => [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 110,
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (source) => <SourceTag source={source} />,
    },
    {
      title: '责任单位',
      dataIndex: 'departmentName',
      width: 140,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: '受理时间',
      dataIndex: 'createdAt',
      width: 150,
    },
    {
      title: '时限情况',
      dataIndex: 'deadline',
      width: 180,
      render: (deadline, record) => {
        const isOverdue =
          dayjs().isAfter(dayjs(deadline)) && record.status !== 'completed';
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
              ) : daysLeft <= 1 ? (
                <Tag color="orange">即将到期 {hoursLeft}小时</Tag>
              ) : (
                <Tag color="green">剩余 {daysLeft}天</Tag>
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
      width: 90,
      render: (count) =>
        count > 0 ? (
          <Tag color="orange">{count} 次</Tag>
        ) : (
          <span className="text-gray-400">0 次</span>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        if (type === 'pending') {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/complaints/${record.id}`)}
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                icon={<Bell size={12} />}
                onClick={() => openUrgeModal(record)}
              >
                催办
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<RotateCcw size={12} />}
                onClick={() => openReturnModal(record)}
              >
                退回
              </Button>
            </Space>
          );
        }
        if (type === 'review') {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/complaints/${record.id}`)}
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircle2 size={12} />}
                onClick={() => openReviewModal(record)}
              >
                审核
              </Button>
            </Space>
          );
        }
        if (type === 'delay') {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/complaints/${record.id}`)}
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                icon={<Clock size={12} />}
                onClick={() => message.info('延期审批功能')}
              >
                审批
              </Button>
            </Space>
          );
        }
        if (type === 'followup') {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/complaints/${record.id}`)}
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                icon={<Phone size={12} />}
                onClick={() => openFollowupModal(record)}
              >
                回访
              </Button>
            </Space>
          );
        }
        return null;
      },
    },
  ];

  const openReturnModal = (record: Complaint) => {
    setSelectedComplaint(record);
    setReturnModalVisible(true);
  };

  const openUrgeModal = (record: Complaint) => {
    setSelectedComplaint(record);
    setUrgeModalVisible(true);
  };

  const openReviewModal = (record: Complaint) => {
    setSelectedComplaint(record);
    setReviewModalVisible(true);
  };

  const openFollowupModal = (record: Complaint) => {
    setSelectedComplaint(record);
    setFollowupModalVisible(true);
  };

  const handleReturn = (values: any) => {
    if (!selectedComplaint) return;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(selectedComplaint.id, {
      id: `${selectedComplaint.id}-return-${Date.now()}`,
      complaintId: selectedComplaint.id,
      type: 'return',
      operator: '督办员',
      content: `退回重办，原因：${values.reason}`,
      createdAt: now,
    });
    updateComplaint(selectedComplaint.id, { status: 'returned' });
    message.success('已退回重办');
    setReturnModalVisible(false);
    form.resetFields();
  };

  const handleUrge = (values: any) => {
    if (!selectedComplaint) return;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(selectedComplaint.id, {
      id: `${selectedComplaint.id}-urge-${Date.now()}`,
      complaintId: selectedComplaint.id,
      type: 'urge',
      operator: '督办员',
      content: values.content || '请加快办理进度',
      createdAt: now,
    });
    updateComplaint(selectedComplaint.id, {
      urgeCount: (selectedComplaint.urgeCount || 0) + 1,
    });
    message.success('催办通知已发送');
    setUrgeModalVisible(false);
    form.resetFields();
  };

  const handleReview = (values: any) => {
    if (!selectedComplaint) return;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    if (values.pass) {
      addTimeline(selectedComplaint.id, {
        id: `${selectedComplaint.id}-review-${Date.now()}`,
        complaintId: selectedComplaint.id,
        type: 'review',
        operator: '督办员',
        content: `审核通过，意见：${values.remark || '办理合格'}`,
        createdAt: now,
      });
      addTimeline(selectedComplaint.id, {
        id: `${selectedComplaint.id}-complete-${Date.now()}`,
        complaintId: selectedComplaint.id,
        type: 'complete',
        operator: '系统',
        content: '投诉已办结归档',
        createdAt: dayjs().add(1, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      });
      updateComplaint(selectedComplaint.id, {
        status: 'completed',
        finishedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
      message.success('审核通过，投诉已办结');
    } else {
      handleReturn({ reason: values.remark || '办理不合格' });
    }
    setReviewModalVisible(false);
    form.resetFields();
  };

  const handleFollowup = (values: any) => {
    if (!selectedComplaint) return;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(selectedComplaint.id, {
      id: `${selectedComplaint.id}-followup-${Date.now()}`,
      complaintId: selectedComplaint.id,
      type: 'process',
      operator: '督办员（回访）',
      content: `回访结果：${values.content || '回访完成'}，满意度：${values.satisfaction || 5}分`,
      createdAt: now,
    });
    if (values.satisfaction) {
      updateComplaint(selectedComplaint.id, {
        satisfaction: values.satisfaction,
      });
    }
    message.success('回访记录已保存');
    setFollowupModalVisible(false);
    form.resetFields();
  };

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span className="flex items-center gap-2">
          <Bell size={16} />
          办理督办
          <Tag color="orange" className="ml-1">
            {pendingList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns('pending')}
          dataSource={pendingList}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'review',
      label: (
        <span className="flex items-center gap-2">
          <ClipboardCheck size={16} />
          待审核
          <Tag color="blue" className="ml-1">
            {reviewList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns('review')}
          dataSource={reviewList}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'delay',
      label: (
        <span className="flex items-center gap-2">
          <Clock size={16} />
          延期审批
          <Tag color="purple" className="ml-1">
            {delayList.length}
          </Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns('delay')}
          dataSource={delayList}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'followup',
      label: (
        <span className="flex items-center gap-2">
          <Phone size={16} />
          抽查回访
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={getColumns('followup')}
          dataSource={completedList}
          scroll={{ x: 1300 }}
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
        title="退回重办"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleReturn}>
          <Form.Item
            label="退回原因"
            name="reason"
            rules={[{ required: true, message: '请输入退回原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细说明退回原因和整改要求" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit">
                确认退回
              </Button>
              <Button onClick={() => setReturnModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="督办催办"
        open={urgeModalVisible}
        onCancel={() => setUrgeModalVisible(false)}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleUrge}>
          <Form.Item label="催办内容" name="content">
            <Input.TextArea
              rows={3}
              placeholder="请输入催办内容"
              defaultValue="请加快办理进度，确保按时办结"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                发送催办
              </Button>
              <Button onClick={() => setUrgeModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审核办理结果"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleReview}>
          <Form.Item
            label="审核结果"
            name="pass"
            rules={[{ required: true, message: '请选择审核结果' }]}
          >
            <Select placeholder="请选择审核结果">
              <Select.Option value={true}>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  审核通过
                </span>
              </Select.Option>
              <Select.Option value={false}>
                <span className="flex items-center gap-2">
                  <XCircle size={16} className="text-red-500" />
                  退回重办
                </span>
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="审核意见" name="remark">
            <Input.TextArea rows={3} placeholder="请输入审核意见" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认审核
              </Button>
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="电话回访"
        open={followupModalVisible}
        onCancel={() => setFollowupModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleFollowup}>
          {selectedComplaint && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                联系人：<span className="text-gray-800">{selectedComplaint.contactName}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                联系电话：<span className="text-gray-800">{selectedComplaint.contactPhone}</span>
              </p>
            </div>
          )}
          <Form.Item label="回访满意度" name="satisfaction">
            <Rate defaultValue={5} />
          </Form.Item>
          <Form.Item label="回访记录" name="content">
            <Input.TextArea rows={4} placeholder="请记录回访内容和群众反馈" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存回访记录
              </Button>
              <Button onClick={() => setFollowupModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Supervision;
