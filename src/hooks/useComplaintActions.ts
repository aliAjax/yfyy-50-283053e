import { useState } from 'react';
import { Form, Modal, message } from 'antd';
import { useAppStore } from '@/store/appStore';
import type { Department, KnowledgeEntry } from '@/types';
import {
  buildCompletedStatus,
  buildCompleteTimeline,
  buildDelayTimeline,
  buildDepartmentChange,
  buildExtensionRequest,
  buildPendingReviewStatus,
  buildProcessTimeline,
  buildReturnedStatus,
  buildReturnTimeline,
  buildReviewPassTimeline,
  buildTransferTimeline,
  buildUrgeCountIncrement,
  buildUrgeTimeline,
  canDelayComplaint,
  canReturnComplaint,
  canReviewComplaint,
  canSubmitProcessResult,
  canTransferComplaint,
  canUrgeComplaint,
  filterActiveKnowledge,
  getDepartmentById,
  getRecommendedKnowledge,
  isComplaintOverdue,
  searchKnowledge,
} from '@/lib/complaintActionHelpers';

interface TransferValues {
  departmentId: string;
  reason: string;
}

interface ReturnValues {
  reason: string;
}

interface DelayValues {
  days: number;
  reason: string;
}

interface UrgeValues {
  content?: string;
}

interface ReviewValues {
  pass: boolean;
  remark?: string;
  satisfaction?: number;
}

interface ProcessValues {
  content: string;
}

export const useComplaintActions = (complaintId?: string) => {
  const {
    getComplaintById,
    updateComplaint,
    addTimeline,
    addExtensionRequest,
    knowledgeEntries,
    incrementKnowledgeUsage,
    getRepeatGroup,
    mergeComplaint,
    detectDuplicates,
  } = useAppStore();

  const complaint = getComplaintById(complaintId || '');
  const [form] = Form.useForm();

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
  const [mergeTargetId, setMergeTargetId] = useState('');

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

  const activeKnowledgeEntries = filterActiveKnowledge(knowledgeEntries);
  const filteredKnowledgeEntries = searchKnowledge(activeKnowledgeEntries, knowledgeSearch);
  const recommendedEntries = getRecommendedKnowledge(activeKnowledgeEntries, complaint);

  const handleTransfer = (values: TransferValues) => {
    if (!complaintId) return;

    const department = getDepartmentById(values.departmentId);
    addTimeline(complaintId, buildTransferTimeline(complaintId, department, values.reason));
    updateComplaint(complaintId, buildDepartmentChange(values.departmentId, department));
    message.success('转办成功');
    setTransferModalVisible(false);
    setSelectedTransferDept(null);
    form.resetFields();
  };

  const handleDeptChange = (departmentId: string) => {
    setSelectedTransferDept(getDepartmentById(departmentId) || null);
  };

  const handleReturn = (values: ReturnValues) => {
    if (!complaintId) return;

    addTimeline(complaintId, buildReturnTimeline(complaintId, values.reason));
    updateComplaint(complaintId, buildReturnedStatus());
    message.success('已退回重办');
    setReturnModalVisible(false);
    form.resetFields();
  };

  const handleDelay = (values: DelayValues) => {
    if (!complaint || !complaintId) return;

    addTimeline(complaintId, buildDelayTimeline(complaintId, values.days, values.reason));
    addExtensionRequest(buildExtensionRequest(complaint, values.days, values.reason));
    message.success('延期申请已提交，等待审批');
    setDelayModalVisible(false);
    form.resetFields();
  };

  const handleUrge = (values: UrgeValues) => {
    if (!complaint || !complaintId) return;

    addTimeline(complaintId, buildUrgeTimeline(complaintId, values.content));
    updateComplaint(complaintId, buildUrgeCountIncrement(complaint));
    message.success('催办通知已发送');
    setUrgeModalVisible(false);
    form.resetFields();
  };

  const handleReview = (values: ReviewValues) => {
    if (!complaintId) return;

    if (values.pass) {
      addTimeline(complaintId, buildReviewPassTimeline(complaintId, values.remark));
      addTimeline(complaintId, buildCompleteTimeline(complaintId));
      updateComplaint(complaintId, buildCompletedStatus(values.satisfaction));
      message.success('审核通过，投诉已办结');
    } else {
      handleReturn({ reason: values.remark || '办理不合格' });
    }

    setReviewModalVisible(false);
    form.resetFields();
  };

  const handleProcess = (values: ProcessValues) => {
    if (!complaintId) return;

    addTimeline(complaintId, buildProcessTimeline(complaintId, values.content));
    updateComplaint(complaintId, buildPendingReviewStatus());
    message.success('办理结果已提交');
    setProcessModalVisible(false);
    form.resetFields();
  };

  const handleSelectKnowledge = (entry: KnowledgeEntry) => {
    form.setFieldsValue({ content: entry.content });
    incrementKnowledgeUsage(entry.id);
    setKnowledgeModalVisible(false);
    setKnowledgeDetailVisible(false);
    setKnowledgeSearch('');
    message.success('已插入知识库模板');
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

  return {
    complaint,
    form,
    transferModalVisible,
    setTransferModalVisible,
    returnModalVisible,
    setReturnModalVisible,
    delayModalVisible,
    setDelayModalVisible,
    urgeModalVisible,
    setUrgeModalVisible,
    reviewModalVisible,
    setReviewModalVisible,
    processModalVisible,
    setProcessModalVisible,
    knowledgeModalVisible,
    setKnowledgeModalVisible,
    knowledgeDetailVisible,
    setKnowledgeDetailVisible,
    knowledgeDetailEntry,
    knowledgeSearch,
    setKnowledgeSearch,
    selectedTransferDept,
    setSelectedTransferDept,
    repeatGroupVisible,
    setRepeatGroupVisible,
    mergeModalVisible,
    setMergeModalVisible,
    mergeTargetId,
    setMergeTargetId,
    repeatGroup,
    similarComplaints,
    activeKnowledgeEntries,
    filteredKnowledgeEntries,
    recommendedEntries,
    isOverdue: complaint ? isComplaintOverdue(complaint) : false,
    canTransfer: complaint ? canTransferComplaint(complaint) : false,
    canReturn: complaint ? canReturnComplaint(complaint) : false,
    canUrge: complaint ? canUrgeComplaint(complaint) : false,
    canDelay: complaint ? canDelayComplaint(complaint) : false,
    canReview: complaint ? canReviewComplaint(complaint) : false,
    canSubmitProcess: complaint ? canSubmitProcessResult(complaint) : false,
    handleTransfer,
    handleDeptChange,
    handleReturn,
    handleDelay,
    handleUrge,
    handleReview,
    handleProcess,
    handleSelectKnowledge,
    handleViewKnowledge,
    handleMergeToComplaint,
  };
};
