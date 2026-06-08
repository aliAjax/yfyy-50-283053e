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
  List,
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
  BookOpen,
  Search,
  Eye,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { ExtensionRequest } from '@/types';
import { StatusTag, SourceTag, SatisfactionTag } from '@/components/StatusTags';
import ComplaintTimeline from '@/components/ComplaintTimeline';
import type { KnowledgeEntry } from '@/types';
import { categories, departments } from '@/data/dictionaries';

const getRootCategoryId = (categoryId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  return category?.parentId || category?.id || categoryId;
};

const isRecommendedKnowledge = (entry: KnowledgeEntry, complaintCategoryId: string) => {
  return getRootCategoryId(entry.categoryId) === getRootCategoryId(complaintCategoryId);
};

interface KnowledgeTemplateListProps {
  entries: KnowledgeEntry[];
  complaintCategoryId: string;
  onPreview: (entry: KnowledgeEntry) => void;
  onUse: (entry: KnowledgeEntry) => void;
  emptyText: string;
}

const KnowledgeTemplateList: React.FC<KnowledgeTemplateListProps> = ({
  entries,
  complaintCategoryId,
  onPreview,
  onUse,
  emptyText,
}) => (
  <List
    dataSource={entries}
    locale={{ emptyText }}
    renderItem={(entry) => {
      const recommended = isRecommendedKnowledge(entry, complaintCategoryId);
      return (
        <List.Item
          className={`rounded-lg border px-3 py-3 mb-2 ${
            recommended ? 'border-orange-200 bg-orange-50/60' : 'border-gray-100 bg-white'
          }`}
          actions={[
            <Button key="preview" type="link" size="small" icon={<Eye size={14} />} onClick={() => onPreview(entry)}>
              预览
            </Button>,
            <Button key="use" type="link" size="small" onClick={() => onUse(entry)}>
              选用
            </Button>,
          ]}
        >
          <List.Item.Meta
            title={
              <Space size={6} wrap>
                <span>{entry.title}</span>
                {recommended && <Tag color="orange">推荐</Tag>}
                <Tag color={entry.status === 'active' ? 'green' : 'default'}>
                  {entry.status === 'active' ? '启用' : '停用'}
                </Tag>
              </Space>
            }
            description={
              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  {entry.categoryName} · {entry.departmentName} · 已用{entry.usageCount}次
                </div>
                <div className="text-sm text-gray-600 line-clamp-2">{entry.content}</div>
                <Space size={[0, 4]} wrap>
                  {entry.keywords.slice(0, 4).map((keyword) => (
                    <Tag key={keyword}>{keyword}</Tag>
                  ))}
                </Space>
              </div>
            }
          />
        </List.Item>
      );
    }}
  />
);

const ComplaintDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    getComplaintById,
    updateComplaint,
    addTimeline,
    addExtensionRequest,
    knowledgeEntries,
    applyKnowledgeEntry,
  } = useAppStore();
  const complaint = getComplaintById(id || '');

  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [knowledgeKeyword, setKnowledgeKeyword] = useState('');
  const [previewKnowledge, setPreviewKnowledge] = useState<KnowledgeEntry | null>(null);
  const [selectedTransferDepartmentId, setSelectedTransferDepartmentId] = useState<string | undefined>();
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
    setSelectedTransferDepartmentId(undefined);
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
    const requestId = `EXT-${id}-${Date.now()}`;
    addTimeline(id!, {
      id: `${id}-delay-${Date.now()}`,
      complaintId: id!,
      type: 'delay',
      operator: '责任单位',
      content: `申请延期 ${values.days} 天，原因：${values.reason}`,
      createdAt: now,
    });
    const request: ExtensionRequest = {
      id: requestId,
      complaintId: id!,
      complaintTitle: complaint.title,
      departmentName: complaint.departmentName,
      days: values.days,
      reason: values.reason,
      status: 'pending',
      createdAt: now,
    };
    addExtensionRequest(request);
    message.success('延期申请已提交，等待审批');
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
      type: 'reply',
      operator: '责任单位',
      content: values.content,
      createdAt: now,
    });
    updateComplaint(id!, { status: 'pending_review' });
    message.success('办理结果已提交');
    setProcessModalVisible(false);
    form.resetFields();
  };

  const activeKnowledgeEntries = knowledgeEntries
    .filter((entry) => entry.status === 'active')
    .sort((a, b) => b.usageCount - a.usageCount);

  const keyword = knowledgeKeyword.trim();
  const filteredKnowledgeEntries = activeKnowledgeEntries.filter((entry) => {
    if (!keyword) return true;
    return (
      entry.title.includes(keyword) ||
      entry.code.includes(keyword) ||
      entry.content.includes(keyword) ||
      entry.categoryName.includes(keyword) ||
      entry.departmentName.includes(keyword) ||
      entry.keywords.some((item) => item.includes(keyword))
    );
  });

  const recommendedKnowledgeEntries = filteredKnowledgeEntries.filter((entry) =>
    isRecommendedKnowledge(entry, complaint.categoryId)
  );
  const otherKnowledgeEntries = filteredKnowledgeEntries.filter(
    (entry) => !isRecommendedKnowledge(entry, complaint.categoryId)
  );

  const handleUseKnowledge = (entry: KnowledgeEntry) => {
    form.setFieldsValue({ content: entry.content });
    applyKnowledgeEntry(entry.id);
    setPreviewKnowledge(null);
    message.success('已选用知识库模板');
  };

  const isOverdue = dayjs().isAfter(dayjs(complaint.deadline)) && complaint.status !== 'completed';
  const selectedTransferDepartment = departments.find(
    (department) => department.id === selectedTransferDepartmentId
  );

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
        onCancel={() => {
          setTransferModalVisible(false);
          setSelectedTransferDepartmentId(undefined);
        }}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleTransfer}>
          <Form.Item
            label="转至单位"
            name="departmentId"
            rules={[{ required: true, message: '请选择责任单位' }]}
          >
            <Select
              placeholder="请选择责任单位"
              onChange={(value) => setSelectedTransferDepartmentId(value)}
              optionLabelProp="label"
            >
              {departments.map((d) => (
                <Select.Option key={d.id} value={d.id} label={d.name}>
                  <div className="py-1">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-gray-500">
                      {d.type} · {d.contactName} · {d.contactPhone}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {selectedTransferDepartment && (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="单位类型">
                  <Tag color="geekblue">{selectedTransferDepartment.type}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="联系人">
                  {selectedTransferDepartment.contactName}
                </Descriptions.Item>
                <Descriptions.Item label="电话">
                  <span className="font-mono">{selectedTransferDepartment.contactPhone}</span>
                </Descriptions.Item>
                <Descriptions.Item label="负责事项" span={2}>
                  <Space size={[0, 4]} wrap>
                    {selectedTransferDepartment.responsibilities.map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
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
              <Button
                onClick={() => {
                  setTransferModalVisible(false);
                  setSelectedTransferDepartmentId(undefined);
                }}
              >
                取消
              </Button>
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
        onCancel={() => {
          setProcessModalVisible(false);
          setKnowledgeKeyword('');
        }}
        footer={null}
        width={880}
      >
        <Form form={form} layout="vertical" onFinish={handleProcess}>
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 font-medium text-gray-800">
                <BookOpen size={16} className="text-blue-500" />
                知识库模板
              </div>
              <Input
                style={{ width: 280 }}
                placeholder="搜索模板标题、关键词或内容"
                prefix={<Search size={15} className="text-gray-400" />}
                value={knowledgeKeyword}
                onChange={(event) => setKnowledgeKeyword(event.target.value)}
                allowClear
              />
            </div>
            <div className="max-h-80 overflow-y-auto pr-1">
              {!keyword && recommendedKnowledgeEntries.length > 0 && (
                <>
                  <div className="text-xs text-gray-500 mb-2">
                    按当前事项分类推荐
                  </div>
                  <KnowledgeTemplateList
                    entries={recommendedKnowledgeEntries}
                    complaintCategoryId={complaint.categoryId}
                    onPreview={setPreviewKnowledge}
                    onUse={handleUseKnowledge}
                    emptyText="暂无推荐模板"
                  />
                </>
              )}
              <div className="text-xs text-gray-500 mb-2">
                {keyword ? '搜索结果' : '全部可用模板'}
              </div>
              <KnowledgeTemplateList
                entries={keyword ? filteredKnowledgeEntries : otherKnowledgeEntries}
                complaintCategoryId={complaint.categoryId}
                onPreview={setPreviewKnowledge}
                onUse={handleUseKnowledge}
                emptyText="暂无可用模板"
              />
            </div>
          </div>
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
              <Button
                onClick={() => {
                  setProcessModalVisible(false);
                  setKnowledgeKeyword('');
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="模板预览"
        open={!!previewKnowledge}
        onCancel={() => setPreviewKnowledge(null)}
        footer={
          previewKnowledge ? (
            <Space>
              <Button onClick={() => setPreviewKnowledge(null)}>关闭</Button>
              <Button type="primary" onClick={() => handleUseKnowledge(previewKnowledge)}>
                使用此模板
              </Button>
            </Space>
          ) : null
        }
        width={720}
      >
        {previewKnowledge && (
          <div className="space-y-4">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="模板标题" span={2}>
                {previewKnowledge.title}
              </Descriptions.Item>
              <Descriptions.Item label="模板编号">{previewKnowledge.code}</Descriptions.Item>
              <Descriptions.Item label="使用次数">{previewKnowledge.usageCount}</Descriptions.Item>
              <Descriptions.Item label="事项分类">{previewKnowledge.categoryName}</Descriptions.Item>
              <Descriptions.Item label="责任单位">{previewKnowledge.departmentName}</Descriptions.Item>
            </Descriptions>
            <Space size={[0, 6]} wrap>
              {previewKnowledge.keywords.map((keywordItem) => (
                <Tag key={keywordItem}>{keywordItem}</Tag>
              ))}
            </Space>
            <div className="whitespace-pre-wrap leading-7 rounded-lg border border-gray-100 bg-gray-50 p-4">
              {previewKnowledge.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ComplaintDetail;
