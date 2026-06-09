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
  Empty,
  List,
  Avatar,
  Progress,
  Alert,
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
  X,
  Sparkles,
  Building2,
  ClipboardList,
  GitMerge,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { ExtensionRequest, KnowledgeEntry, Department } from '@/types';
import { StatusTag, SourceTag, SatisfactionTag } from '@/components/StatusTags';
import ComplaintTimeline from '@/components/ComplaintTimeline';
import { departments, statusMap, statusColorMap } from '@/data/dictionaries';
import { getSimilarityColor, getSimilarityLevel } from '@/lib/utils';
import type { DuplicateComplaintResult } from '@/types';

interface KnowledgeCardProps {
  entry: KnowledgeEntry;
  recommended?: boolean;
  onSelect: () => void;
  onGenerateDraft: () => void;
  onView: () => void;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ entry, recommended, onSelect, onGenerateDraft, onView }) => {
  return (
    <div
      className={`border rounded-lg p-4 transition-colors group ${
        recommended
          ? 'border-orange-200 bg-orange-50/30 hover:border-orange-400 hover:bg-orange-50/50'
          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className={recommended ? 'text-orange-500 flex-shrink-0' : 'text-blue-500 flex-shrink-0'} />
            <span className="font-medium text-gray-800 truncate">{entry.title}</span>
            {recommended && (
              <Tag color="orange" className="m-0 text-xs flex-shrink-0">
                推荐
              </Tag>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span>{entry.categoryName}</span>
            <span>·</span>
            <span>{entry.departmentName}</span>
            <span>·</span>
            <span className="text-orange-500">使用 {entry.usageCount} 次</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {entry.content}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.keywords.slice(0, 4).map((kw, idx) => (
              <Tag key={idx} color="blue" className="m-0 text-xs">
                {kw}
              </Tag>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            预览
          </Button>
          <Button
            type="text"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            直接插入
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<Sparkles size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateDraft();
            }}
          >
            生成草稿
          </Button>
        </div>
      </div>
    </div>
  );
};

const ComplaintDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getComplaintById, updateComplaint, addTimeline, addExtensionRequest, knowledgeEntries, incrementKnowledgeUsage, getRepeatGroup, mergeComplaint, detectDuplicates } = useAppStore();
  const complaint = getComplaintById(id || '');

  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [urgeModalVisible, setUrgeModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [knowledgeModalVisible, setKnowledgeModalVisible] = useState(false);
  const [knowledgeDetailVisible, setKnowledgeDetailVisible] = useState(false);
  const [knowledgeDetailEntry, setKnowledgeDetailEntry] = useState<KnowledgeEntry | null>(null);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [selectedTransferDept, setSelectedTransferDept] = useState<Department | null>(null);
  const [repeatGroupVisible, setRepeatGroupVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [form] = Form.useForm();
  const [draftInfo, setDraftInfo] = useState<{ entryId: string; entryTitle: string; generatedAt: string } | null>(null);

  const repeatGroup = complaint?.repeatGroupId
    ? getRepeatGroup(complaint.repeatGroupId)
    : [];

  const similarComplaints = complaint
    ? detectDuplicates(
        {
          title: complaint.title,
          categoryId: complaint.categoryId,
          areaId: complaint.areaId,
          address: complaint.address,
          contactPhone: complaint.contactPhone,
        },
        complaint.id
      ).slice(0, 5)
    : [];

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
    setSelectedTransferDept(null);
    form.resetFields();
  };

  const handleDeptChange = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    setSelectedTransferDept(dept || null);
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
    setDraftInfo(null);
    form.resetFields();
  };

  const activeKnowledgeEntries = knowledgeEntries.filter((k) => k.status === 'active');

  const filteredKnowledgeEntries = activeKnowledgeEntries.filter((k) => {
    if (knowledgeSearch) {
      const keyword = knowledgeSearch.toLowerCase();
      const matchTitle = k.title.toLowerCase().includes(keyword);
      const matchContent = k.content.toLowerCase().includes(keyword);
      const matchKeywords = k.keywords.some(kw => kw.toLowerCase().includes(keyword));
      const matchCategory = k.categoryName.toLowerCase().includes(keyword);
      if (!matchTitle && !matchContent && !matchKeywords && !matchCategory) return false;
    }
    return true;
  });

  const recommendedEntries = activeKnowledgeEntries.filter((k) => {
    return k.categoryId === complaint?.categoryId || k.categoryId.startsWith(complaint?.categoryId?.split('-')[0] || '');
  }).sort((a, b) => b.usageCount - a.usageCount);

  const handleSelectKnowledge = (entry: KnowledgeEntry) => {
    form.setFieldsValue({ content: entry.content });
    incrementKnowledgeUsage(entry.id);
    setDraftInfo(null);
    setKnowledgeModalVisible(false);
    setKnowledgeDetailVisible(false);
    setKnowledgeSearch('');
    message.success('已插入知识库模板');
  };

  const handleGenerateDraft = (entry: KnowledgeEntry) => {
    const today = dayjs().format('YYYY年MM月DD日');
    const draftContent = `尊敬的市民：

您好！

您反映的关于「${complaint?.title}」的投诉事项已收悉。我单位高度重视，立即安排相关工作人员进行核实处理，现将办理情况答复如下：

【投诉分类】${complaint?.categoryName}
【所属区域】${complaint?.areaName}${complaint?.address ? `（${complaint.address}）` : ''}
【责任单位】${complaint?.departmentName}

${entry.content}

感谢您对我们工作的监督与支持，如您对以上答复有异议或还有其他问题，欢迎继续反映。

此复。

${complaint?.departmentName}
${today}`;

    form.setFieldsValue({ content: draftContent });
    incrementKnowledgeUsage(entry.id);
    setDraftInfo({
      entryId: entry.id,
      entryTitle: entry.title,
      generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });
    setKnowledgeModalVisible(false);
    setKnowledgeDetailVisible(false);
    setKnowledgeSearch('');
    setProcessModalVisible(true);
    message.success('已生成答复草稿，您可以继续编辑');
  };

  const handleViewKnowledge = (entry: KnowledgeEntry) => {
    setKnowledgeDetailEntry(entry);
    setKnowledgeDetailVisible(true);
  };

  const handleMergeToComplaint = (targetId: string) => {
    Modal.confirm({
      title: '确认合并投诉',
      content: `确定要将当前投诉合并到投诉 ${targetId} 吗？合并后两条投诉将关联为重复投诉。`,
      okText: '确认合并',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (complaint) {
          mergeComplaint(complaint.id, targetId, '督办员');
          message.success('投诉合并成功');
          setMergeModalVisible(false);
        }
      },
    });
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
          {complaint.isRepeat && repeatGroup.length > 0 && (
            <Tag color="pink" icon={<GitMerge size={12} />} className="cursor-pointer" onClick={() => setRepeatGroupVisible(true)}>
              重复投诉 ({repeatGroup.length}件)
            </Tag>
          )}
          {isOverdue && complaint.status !== 'completed' && (
            <Tag color="red">已超期</Tag>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <Space>
            <Button
              icon={<GitMerge size={14} />}
              onClick={() => setMergeModalVisible(true)}
            >
              合并投诉
            </Button>
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
              <Descriptions.Item label="派单方式">
                <Tag color={complaint.assignSource === 'auto' ? 'green' : 'orange'}>
                  {complaint.assignSource === 'auto' ? '智能派单' : '人工派单'}
                </Tag>
              </Descriptions.Item>
              {complaint.dispatchRuleName && (
                <Descriptions.Item label="匹配规则">
                  <span className="text-blue-600">{complaint.dispatchRuleName}</span>
                </Descriptions.Item>
              )}
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
              {complaint.isRepeat && repeatGroup.length > 0 && (
                <>
                  <Descriptions.Item label="重复投诉">
                    <Tag color="pink" icon={<GitMerge size={10} />}>是 ({repeatGroup.length} 件)</Tag>
                  </Descriptions.Item>
                  {complaint.repeatGroupId && (
                    <Descriptions.Item label="重复组号">
                      <span className="font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => setRepeatGroupVisible(true)}>
                        {complaint.repeatGroupId}
                      </span>
                    </Descriptions.Item>
                  )}
                </>
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
          <Card title={<span className="font-semibold">办理时间线</span>} className="shadow-sm mb-4">
            <ComplaintTimeline records={complaint.timelines} />
          </Card>

          {(complaint.status === 'processing' || complaint.status === 'returned') && recommendedEntries.length > 0 && (
            <Card
              title={
                <span className="font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-orange-500" />
                  推荐知识
                </span>
              }
              className="shadow-sm mb-4"
              size="small"
              extra={
                <Button
                  type="link"
                  size="small"
                  icon={<BookOpen size={12} />}
                  onClick={() => {
                    setKnowledgeModalVisible(true);
                  }}
                >
                  更多
                </Button>
              }
            >
              <div className="space-y-2">
                {recommendedEntries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-orange-100 rounded-lg p-3 bg-orange-50/30 hover:bg-orange-50/50 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BookOpen size={13} className="text-orange-500 flex-shrink-0" />
                          <span className="font-medium text-sm text-gray-800 truncate">
                            {entry.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                          <span>{entry.categoryName}</span>
                          <span>·</span>
                          <span className="text-orange-500">使用 {entry.usageCount} 次</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {entry.content}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-orange-100/60">
                      <Button
                        type="text"
                        size="small"
                        icon={<Eye size={12} />}
                        onClick={() => handleViewKnowledge(entry)}
                      >
                        预览
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        icon={<Sparkles size={11} />}
                        onClick={() => {
                          handleGenerateDraft(entry);
                        }}
                      >
                        生成草稿
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {complaint.isRepeat && repeatGroup.length > 0 && (
            <Card
              title={
                <span className="font-semibold flex items-center gap-2">
                  <GitMerge size={16} className="text-pink-500" />
                  关联重复投诉 ({repeatGroup.length})
                </span>
              }
              className="shadow-sm"
              size="small"
            >
              <List
                size="small"
                dataSource={repeatGroup}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    className="cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                    onClick={() => navigate(`/complaints/${item.id}`)}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-800 truncate flex-1">
                          {item.title}
                        </span>
                        {item.id === complaint.id && (
                          <Tag color="blue" className="m-0 text-xs">
                            当前
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <span className="font-mono">{item.id}</span>
                        <span>·</span>
                        <Tag color={statusColorMap[item.status]} className="m-0" style={{ fontSize: '10px', padding: '0 4px' }}>
                          {statusMap[item.status]}
                        </Tag>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {similarComplaints.length > 0 && (
            <Card
              title={
                <span className="font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  疑似相似投诉
                </span>
              }
              className="shadow-sm mt-4"
              size="small"
            >
              <List
                size="small"
                dataSource={similarComplaints}
                renderItem={(item: DuplicateComplaintResult) => {
                  const level = getSimilarityLevel(item.similarity);
                  const color = getSimilarityColor(item.similarity);
                  return (
                    <List.Item
                      key={item.complaint.id}
                      className="hover:bg-gray-50 -mx-2 px-2 rounded mb-2 last:mb-0"
                      style={{ padding: '8px 8px' }}
                    >
                      <div className="w-full">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div
                            className="text-sm text-gray-800 truncate flex-1 cursor-pointer hover:text-blue-600"
                            onClick={() => navigate(`/complaints/${item.complaint.id}`)}
                          >
                            {item.complaint.title}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold" style={{ color }}>
                              {Math.round(item.similarity * 100)}%
                            </div>
                          </div>
                        </div>
                        <Progress
                          percent={Math.round(item.similarity * 100)}
                          strokeColor={color}
                          size="small"
                          showInfo={false}
                          className="mb-1"
                        />
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 flex-wrap">
                          <span className="font-mono text-blue-600">{item.complaint.id}</span>
                          <span>·</span>
                          <span>{item.complaint.areaName}</span>
                          <Tag color={statusColorMap[item.complaint.status]} className="m-0 ml-1" style={{ fontSize: '10px', padding: '0 4px' }}>
                            {statusMap[item.complaint.status]}
                          </Tag>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.matchReasons.slice(0, 2).map((reason, idx) => (
                            <Tag key={idx} color="blue" className="m-0 text-xs">
                              {reason}
                            </Tag>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="small"
                            type="primary"
                            danger={level === 'high'}
                            icon={<GitMerge size={12} />}
                            onClick={() => handleMergeToComplaint(item.complaint.id)}
                          >
                            合并
                          </Button>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="转办工单"
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          setSelectedTransferDept(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleTransfer}>
          <Form.Item
            label="转至单位"
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

          {selectedTransferDept && (
            <div className="mb-4 p-4 bg-blue-50/60 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={22} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800">
                    {selectedTransferDept.name}
                  </div>
                  <Tag color={getTypeTagColor(selectedTransferDept.type)} className="m-0 mt-1">
                    {selectedTransferDept.type}
                  </Tag>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {selectedTransferDept.contact && (
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">联系人：{selectedTransferDept.contact}</span>
                  </div>
                )}
                {selectedTransferDept.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="font-mono">电话：{selectedTransferDept.phone}</span>
                  </div>
                )}
              </div>
              {selectedTransferDept.address && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                  <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">地址：{selectedTransferDept.address}</span>
                </div>
              )}
              {selectedTransferDept.responsibilities && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                    <ClipboardList size={12} />
                    <span>主要职责</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedTransferDept.responsibilities}
                  </p>
                </div>
              )}
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
              <Button onClick={() => {
                setTransferModalVisible(false);
                setSelectedTransferDept(null);
              }}>取消</Button>
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
          setDraftInfo(null);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        {draftInfo && (
          <Alert
            type="info"
            showIcon
            icon={<Sparkles size={14} />}
            message={
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">已生成答复草稿</span>
                  <Tag color="blue" className="m-0 text-xs">
                    来源：{draftInfo.entryTitle}
                  </Tag>
                  <span className="text-xs text-gray-400">
                    生成时间：{draftInfo.generatedAt}
                  </span>
                </div>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => setDraftInfo(null)}
                >
                  清除草稿标记
                </Button>
              </div>
            }
            description="草稿已自动带入投诉分类、区域和责任单位信息，您可以继续编辑下方内容。"
            className="mb-4"
          />
        )}
        <Form form={form} layout="vertical" onFinish={handleProcess}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">办理结果</label>
            <Button
              type="link"
              size="small"
              icon={<BookOpen size={14} />}
              onClick={() => setKnowledgeModalVisible(true)}
            >
              从知识库选择
            </Button>
          </div>
          <Form.Item
            name="content"
            rules={[{ required: true, message: '请输入办理结果' }]}
          >
            <Input.TextArea
              rows={8}
              placeholder="请详细描述办理过程和结果，或点击上方从知识库生成答复草稿"
              onChange={() => {
                if (draftInfo) {
                  setDraftInfo({ ...draftInfo });
                }
              }}
            />
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
              <Button onClick={() => {
                setProcessModalVisible(false);
                setDraftInfo(null);
              }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="选择知识库模板"
        open={knowledgeModalVisible}
        onCancel={() => {
          setKnowledgeModalVisible(false);
          setKnowledgeSearch('');
        }}
        footer={null}
        width={760}
        destroyOnClose
      >
        <div className="space-y-4">
          <Input
            placeholder="搜索标题、内容、关键词、分类"
            prefix={<Search size={16} className="text-gray-400" />}
            value={knowledgeSearch}
            onChange={(e) => setKnowledgeSearch(e.target.value)}
            allowClear
            autoFocus
          />

          <div className="max-h-[500px] overflow-y-auto pr-1 space-y-5">
            {knowledgeSearch ? (
              <>
                <div className="text-sm font-medium text-gray-700">
                  搜索结果（{filteredKnowledgeEntries.length} 条）
                </div>
                {filteredKnowledgeEntries.length === 0 ? (
                  <Empty description="暂无匹配的知识条目" />
                ) : (
                  <div className="space-y-2">
                    {filteredKnowledgeEntries.map((entry) => (
                      <KnowledgeCard
                        key={entry.id}
                        entry={entry}
                        onSelect={() => handleSelectKnowledge(entry)}
                        onGenerateDraft={() => handleGenerateDraft(entry)}
                        onView={() => handleViewKnowledge(entry)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {recommendedEntries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={16} className="text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">
                        推荐模板
                      </span>
                      <span className="text-xs text-gray-400">
                        （基于当前投诉分类推荐）
                      </span>
                    </div>
                    <div className="space-y-2">
                      {recommendedEntries.slice(0, 5).map((entry) => (
                        <KnowledgeCard
                          key={entry.id}
                          entry={entry}
                          recommended
                          onSelect={() => handleSelectKnowledge(entry)}
                          onGenerateDraft={() => handleGenerateDraft(entry)}
                          onView={() => handleViewKnowledge(entry)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    全部模板（{activeKnowledgeEntries.length} 条）
                  </div>
                  <div className="space-y-2">
                    {activeKnowledgeEntries.map((entry) => (
                      <KnowledgeCard
                        key={entry.id}
                        entry={entry}
                        onSelect={() => handleSelectKnowledge(entry)}
                        onGenerateDraft={() => handleGenerateDraft(entry)}
                        onView={() => handleViewKnowledge(entry)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-500" />
            <span>模板详情</span>
          </div>
        }
        open={knowledgeDetailVisible}
        onCancel={() => setKnowledgeDetailVisible(false)}
        footer={null}
        width={640}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        {knowledgeDetailEntry && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">
                {knowledgeDetailEntry.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-mono text-blue-600">{knowledgeDetailEntry.id}</span>
                <span>{knowledgeDetailEntry.categoryName}</span>
                <span>·</span>
                <span>{knowledgeDetailEntry.departmentName}</span>
                <span>·</span>
                <span className="text-orange-500">使用 {knowledgeDetailEntry.usageCount} 次</span>
              </div>
            </div>

            <Divider className="my-0" />

            <div>
              <div className="text-sm text-gray-500 mb-2">关键词</div>
              <Space wrap size={[6, 6]}>
                {knowledgeDetailEntry.keywords.map((kw, idx) => (
                  <Tag key={idx} color="blue">
                    {kw}
                  </Tag>
                ))}
              </Space>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-2">处理口径内容</div>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {knowledgeDetailEntry.content}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setKnowledgeDetailVisible(false)}>关闭</Button>
              <Button
                onClick={() => handleSelectKnowledge(knowledgeDetailEntry)}
              >
                直接插入
              </Button>
              <Button
                type="primary"
                icon={<Sparkles size={14} />}
                onClick={() => handleGenerateDraft(knowledgeDetailEntry)}
              >
                生成答复草稿
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <GitMerge size={20} className="text-pink-500" />
            <span>合并投诉</span>
          </div>
        }
        open={mergeModalVisible}
        onCancel={() => {
          setMergeModalVisible(false);
          setMergeTargetId('');
        }}
        footer={null}
        width={720}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="选择要合并到的目标投诉"
            description="合并后，当前投诉将作为重复投诉与目标投诉关联，不影响目标投诉的处理状态。"
          />

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">推荐的相似投诉</div>
            {similarComplaints.length > 0 ? (
              <List
                size="small"
                dataSource={similarComplaints}
                renderItem={(item) => (
                  <List.Item
                    key={item.complaint.id}
                    className={`border rounded-lg mb-2 cursor-pointer transition-colors ${
                      mergeTargetId === item.complaint.id
                        ? 'border-pink-400 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                    style={{ padding: '12px' }}
                    onClick={() => setMergeTargetId(item.complaint.id)}
                  >
                    <div className="w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 truncate">
                              {item.complaint.title}
                            </span>
                            <Tag color={statusColorMap[item.complaint.status]} className="m-0 text-xs">
                              {statusMap[item.complaint.status]}
                            </Tag>
                          </div>
                          <div className="text-xs text-gray-500">
                            <span className="font-mono text-blue-600">{item.complaint.id}</span>
                            <span className="mx-1">·</span>
                            <span>{item.complaint.areaName}</span>
                            <span className="mx-1">·</span>
                            <span>{item.complaint.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div
                            className="text-sm font-bold"
                            style={{
                              color: item.similarity >= 0.7 ? '#f5222d' : '#fa8c16',
                            }}
                          >
                            {Math.round(item.similarity * 100)}%
                          </div>
                          <div className="text-xs text-gray-400">相似度</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.matchReasons.map((reason, idx) => (
                          <Tag key={idx} color="blue" className="m-0 text-xs">
                            {reason}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无相似投诉" />
            )}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">或手动输入投诉编号</div>
            <div className="flex gap-2">
              <Input
                placeholder="请输入目标投诉编号"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value.toUpperCase())}
                allowClear
              />
              <Button
                type="primary"
                danger
                icon={<GitMerge size={14} />}
                disabled={!mergeTargetId || mergeTargetId === complaint?.id}
                onClick={() => mergeTargetId && handleMergeToComplaint(mergeTargetId)}
              >
                合并
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <GitMerge size={20} className="text-pink-500" />
            <span>重复投诉组详情</span>
          </div>
        }
        open={repeatGroupVisible}
        onCancel={() => setRepeatGroupVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">重复组号</div>
              <div className="text-lg font-semibold text-gray-800 font-mono">
                {complaint?.repeatGroupId}
              </div>
            </div>
            <Tag color="pink" className="m-0">
              共 {repeatGroup.length} 件
            </Tag>
          </div>

          <List
            dataSource={repeatGroup}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                className="border border-gray-200 rounded-lg mb-2 hover:border-blue-300 cursor-pointer transition-colors"
                style={{ padding: '12px' }}
                onClick={() => {
                  navigate(`/complaints/${item.id}`);
                  setRepeatGroupVisible(false);
                }}
              >
                <div className="w-full flex items-center gap-3">
                  <Avatar
                    size={40}
                    style={{ backgroundColor: item.id === complaint?.id ? '#1890ff' : '#d9d9d9' }}
                    icon={<FileText size={18} />}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800 truncate">
                        {item.title}
                      </span>
                      {item.id === complaint?.id && (
                        <Tag color="blue" className="m-0 text-xs">
                          当前
                        </Tag>
                      )}
                      <Tag color={statusColorMap[item.status]} className="m-0 text-xs">
                        {statusMap[item.status]}
                      </Tag>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-mono">{item.id}</span>
                      <span>·</span>
                      <span>{item.areaName}</span>
                      <span>·</span>
                      <span>{item.createdAt}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ComplaintDetail;
