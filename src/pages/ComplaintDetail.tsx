import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Divider,
} from 'antd';
import {
  ArrowLeft,
  Send,
  RotateCcw,
  Clock,
  Bell,
  MessageSquare,
  User,
  Phone,
  MapPin,
  FileText,
  ThumbsUp,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { StatusTag, SourceTag, SatisfactionTag } from '@/components/StatusTags';
import ComplaintTimeline from '@/components/ComplaintTimeline';
import { departments } from '@/data/dictionaries';

const ComplaintDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getComplaintById, updateComplaint, addTimeline } = useAppStore();
  const complaint = getComplaintById(id || '');

  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [form] = Form.useForm();

  if (!complaint) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">投诉不存在</p>
        <Button type="primary" onClick={() => navigate('/complaints')} className="mt-4">
          返回列表
        </Button>
      </div>
    );
  }

  const handleTransfer = (values: { departmentId: string; reason: string }) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const newDept = departments.find((d) => d.id === values.departmentId);
    addTimeline(id!, {
      id: `${id}-transfer-${Date.now()}`,
      complaintId: id!,
      type: 'transfer',
      operator: '督办员',
      content: `转办至 ${newDept?.name || '新责任单位'}，原因：${values.reason}`,
      createdAt: now,
    });
    updateComplaint(id!, {
      departmentId: values.departmentId,
      departmentName: newDept?.name || '',
    });
    message.success('转办成功');
    setTransferModalVisible(false);
    form.resetFields();
  };

  const handleReturn = (values: { reason: string }) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(id!, {
      id: `${id}-return-${Date.now()}`,
      complaintId: id!,
      type: 'return',
      operator: '督办员',
      content: `退回重办，原因：${values.reason}`,
      createdAt: now,
    });
    updateComplaint(id!, { status: 'returned' });
    message.success('已退回重办');
    setReturnModalVisible(false);
    form.resetFields();
  };

  const handleDelay = (values: { days: number; reason: string }) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(id!, {
      id: `${id}-delay-${Date.now()}`,
      complaintId: id!,
      type: 'delay',
      operator: '责任单位',
      content: `申请延期 ${values.days} 天，原因：${values.reason}`,
      createdAt: now,
    });
    message.success('延期申请已提交');
    setDelayModalVisible(false);
    form.resetFields();
  };

  const handleUrge = (values: { content?: string }) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(id!, {
      id: `${id}-urge-${Date.now()}`,
      complaintId: id!,
      type: 'urge',
      operator: '督办员',
      content: `督办催办：${values.content || '请加快办理进度'}`,
      createdAt: now,
    });
    updateComplaint(id!, { urgeCount: (complaint.urgeCount || 0) + 1 });
    message.success('催办通知已发送');
    setUrgeModalVisible(false);
    form.resetFields();
  };

  const handleReview = (values: { pass: boolean; remark?: string; satisfaction?: number }) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    if (values.pass) {
      addTimeline(id!, {
        id: `${id}-review-${Date.now()}`,
        complaintId: id!,
        type: 'review',
        operator: '督办员',
        content: `审核通过，评价：${values.remark || '办理合格'}`,
        createdAt: now,
      });
      addTimeline(id!, {
        id: `${id}-complete-${Date.now()}`,
        complaintId: id!,
        type: 'complete',
        operator: '系统',
        content: '投诉已办结归档',
        createdAt: dayjs().add(1, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      });
      updateComplaint(id!, {
        status: 'completed',
        finishedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        satisfaction: values.satisfaction || 5,
      });
      message.success('审核通过，投诉已办结');
    } else {
      handleReturn({ reason: values.remark || '办理不合格' });
    }
    setReviewModalVisible(false);
    form.resetFields();
  };

  const handleProcess = (values: { content: string }) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    addTimeline(id!, {
      id: `${id}-process-${Date.now()}`,
      complaintId: id!,
      type: 'process',
      operator: '责任单位',
      content: values.content,
      createdAt: now,
    });
    updateComplaint(id!, { status: 'pending_review' });
    message.success('办理结果已提交');
    setProcessModalVisible(false);
    form.resetFields();
  };

  const isOverdue = dayjs().isAfter(dayjs(complaint.deadline)) && complaint.status !== 'completed';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/complaints')}
            className="text-gray-600"
          >
            返回列表
          </Button>
          <h2 className="text-lg font-semibold text-gray-800">投诉详情</h2>
          <StatusTag status={complaint.status} />
          {complaint.isRepeat && <Tag color="orange">重复投诉</Tag>}
          {isOverdue && complaint.status !== 'completed' && (
            <Tag color="red">已超期</Tag>
          )}
        </div>
        <Space>
          {complaint.status === 'processing' && (
            <>
              <Button icon={<Send size={14} />} onClick={() => setTransferModalVisible(true)}>
                转办
              </Button>
              <Button icon={<RotateCcw size={14} />} onClick={() => setReturnModalVisible(true)}>
                退回
              </Button>
              <Button icon={<Bell size={14} />} onClick={() => setUrgeModalVisible(true)}>
                催办
              </Button>
              <Button type="primary" icon={<Clock size={14} />} onClick={() => setDelayModalVisible(true)}>
                延期申请
              </Button>
            </>
          )}
          {complaint.status === 'pending_review' && (
            <Button type="primary" icon={<ThumbsUp size={14} />} onClick={() => setReviewModalVisible(true)}>
              审核
            </Button>
          )}
          {(complaint.status === 'processing' || complaint.status === 'returned') && (
            <Button type="primary" icon={<MessageSquare size={14} />} onClick={() => setProcessModalVisible(true)}>
              提交办理结果
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={<span className="font-semibold">投诉信息</span>} className="shadow-sm">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="投诉编号">
                <span className="font-mono text-blue-600">{complaint.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="投诉来源">
                <SourceTag source={complaint.source} />
              </Descriptions.Item>
              <Descriptions.Item label="投诉标题" span={2}>
                {complaint.title}
              </Descriptions.Item>
              <Descriptions.Item label="事项分类" span={2}>
                {complaint.categoryName}
              </Descriptions.Item>
              <Descriptions.Item label="所属区域" span={2}>
                {complaint.areaName} {complaint.address}
              </Descriptions.Item>
              <Descriptions.Item label="责任单位">
                {complaint.departmentName}
              </Descriptions.Item>
              <Descriptions.Item label="办理状态">
                <StatusTag status={complaint.status} />
              </Descriptions.Item>
              <Descriptions.Item label="受理时间">
                {complaint.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="办理时限">
                <span className={isOverdue ? 'text-red-500' : ''}>
                  {complaint.deadline}
                </span>
              </Descriptions.Item>
              {complaint.finishedAt && (
                <Descriptions.Item label="办结时间">
                  {complaint.finishedAt}
                </Descriptions.Item>
              )}
              {complaint.satisfaction && (
                <Descriptions.Item label="满意度评价">
                  <SatisfactionTag score={complaint.satisfaction} />
                </Descriptions.Item>
              )}
              {complaint.urgeCount !== undefined && complaint.urgeCount > 0 && (
                <Descriptions.Item label="催办次数">
                  <Tag color="orange">{complaint.urgeCount} 次</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                投诉内容
              </h4>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {complaint.content}
              </p>
            </div>

            <Divider />

            <div>
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <User size={16} className="text-blue-500" />
                联系人信息
              </h4>
              <Row gutter={[16, 8]}>
                <Col span={8}>
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={14} className="text-gray-400" />
                    <span>{complaint.contactName}</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    <span>{complaint.contactPhone}</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{complaint.address}</span>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<span className="font-semibold">办理时间线</span>} className="shadow-sm">
            <ComplaintTimeline records={complaint.timelines} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="转办工单"
        open={transferModalVisible}
        onCancel={() => setTransferModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleTransfer}>
          <Form.Item
            label="转至单位"
            name="departmentId"
            rules={[{ required: true, message: '请选择责任单位' }]}
          >
            <Select placeholder="请选择责任单位">
              {departments.map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="转办原因"
            name="reason"
            rules={[{ required: true, message: '请输入转办原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入转办原因" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认转办
              </Button>
              <Button onClick={() => setTransferModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="退回重办"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleReturn}>
          <Form.Item
            label="退回原因"
            name="reason"
            rules={[{ required: true, message: '请输入退回原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细说明退回原因" />
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
        title="延期申请"
        open={delayModalVisible}
        onCancel={() => setDelayModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleDelay}>
          <Form.Item
            label="延长期限"
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

      <Modal
        title="督办催办"
        open={urgeModalVisible}
        onCancel={() => setUrgeModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleUrge}>
          <Form.Item label="催办内容" name="content">
            <Input.TextArea rows={3} placeholder="请输入催办内容" defaultValue="请加快办理进度，确保按时办结" />
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
              <Select.Option value={true}>审核通过</Select.Option>
              <Select.Option value={false}>退回重办</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="满意度评价" name="satisfaction">
            <Select placeholder="请选择满意度">
              <Select.Option value={5}>非常满意 ★★★★★</Select.Option>
              <Select.Option value={4}>满意 ★★★★☆</Select.Option>
              <Select.Option value={3}>一般 ★★★☆☆</Select.Option>
              <Select.Option value={2}>不满意 ★★☆☆☆</Select.Option>
              <Select.Option value={1}>非常不满意 ★☆☆☆☆</Select.Option>
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
            <Input.TextArea rows={6} placeholder="请详细描述办理过程和结果" />
          </Form.Item>
          <Form.Item label="附件上传" name="files">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 hover:border-blue-300 transition-colors cursor-pointer">
              <FileText size={32} className="mx-auto mb-2" />
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
    </div>
  );
};

export default ComplaintDetail;
