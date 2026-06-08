import { Form, Input, Select, Button, Card, message, Tabs, Tag, Descriptions, Alert, Modal, List, Avatar, Progress } from 'antd';
import {
  FileText,
  List as ListIcon,
  MapPin,
  User,
  Phone,
  Send,
  Home,
  CheckCircle,
  AlignLeft,
  Search,
  Clock,
  Zap,
  Building2,
  ClipboardList,
  AlertTriangle,
  GitMerge,
  Plus,
  X,
  ChevronRight,
  XCircle,
  Users,
  Info,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import type { Complaint, Department, AssignSource, DuplicateComplaintResult } from '@/types';
import ComplaintTimeline from '@/components/ComplaintTimeline';
import { categories, areas, departments, statusMap, statusColorMap, assignSourceMap } from '@/data/dictionaries';
import type { DispatchMatchResult } from '@/lib/utils';
import { getSimilarityColor, getSimilarityLabel, getSimilarityLevel } from '@/lib/utils';

const PublicSubmit: React.FC = () => {
  const navigate = useNavigate();
  const { submitPublicComplaint, queryComplaintPublic, matchDispatch, detectDuplicates, mergeComplaint, getComplaintById } = useAppStore();
  const [submitForm] = Form.useForm();
  const [queryForm] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [newComplaint, setNewComplaint] = useState<Complaint | null>(null);
  const [queriedComplaint, setQueriedComplaint] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState('submit');
  const [matchResult, setMatchResult] = useState<DispatchMatchResult | null>(null);
  const [matchedDept, setMatchedDept] = useState<Department | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>('c1-1');
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>('a1');
  const [duplicateResults, setDuplicateResults] = useState<DuplicateComplaintResult[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [isMergedSubmit, setIsMergedSubmit] = useState(false);
  const [mergedToComplaint, setMergedToComplaint] = useState<Complaint | null>(null);
  const [expandedSimilarityIndex, setExpandedSimilarityIndex] = useState<number | null>(null);

  const topLevelCategories = categories.filter((c) => !c.parentId);

  const getSubCategories = (parentId: string) => {
    return categories.filter((c) => c.parentId === parentId);
  };

  useEffect(() => {
    if (selectedCatId && selectedAreaId) {
      const result = matchDispatch(selectedCatId, selectedAreaId);
      setMatchResult(result);
      if (result.matched && result.rule) {
        setMatchedDept(departments.find(d => d.id === result.rule?.departmentId) || null);
      } else {
        setMatchedDept(null);
      }
    }
  }, [selectedCatId, selectedAreaId]);

  const handleCategoryChange = (value: string) => {
    setSelectedCatId(value);
  };

  const handleAreaChange = (value: string) => {
    setSelectedAreaId(value);
  };

  const doSubmit = useCallback((values: {
    title: string;
    categoryId: string;
    areaId: string;
    address: string;
    contactName: string;
    contactPhone: string;
    content: string;
  }) => {
    const category = categories.find((c) => c.id === values.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === values.areaId);
    
    const categoryName = parentCategory
      ? `${parentCategory.name} - ${category?.name}`
      : category?.name || '';

    let departmentId = departments[0].id;
    let departmentName = departments[0].name;
    let assignSource: AssignSource = 'auto';
    let dispatchRuleId: string | undefined;
    let dispatchRuleName: string | undefined;

    if (matchResult?.matched && matchResult.rule) {
      departmentId = matchResult.rule.departmentId;
      departmentName = matchResult.rule.departmentName;
      assignSource = 'auto';
      dispatchRuleId = matchResult.rule.id;
      dispatchRuleName = matchResult.rule.name;
    } else {
      departmentId = departments[0].id;
      departmentName = departments[0].name;
      assignSource = 'manual';
    }

    const result = submitPublicComplaint({
      title: values.title,
      content: values.content,
      categoryId: values.categoryId,
      categoryName,
      areaId: values.areaId,
      areaName: area?.name || '',
      address: values.address,
      contactName: values.contactName,
      contactPhone: values.contactPhone,
      departmentId,
      departmentName,
      assignSource,
      dispatchRuleId,
      dispatchRuleName,
    });

    setNewComplaint(result);
    setSubmitted(true);
    message.success('投诉提交成功');
  }, [matchResult, submitPublicComplaint]);

  const handleSubmit = (values: {
    title: string;
    categoryId: string;
    areaId: string;
    address: string;
    contactName: string;
    contactPhone: string;
    content: string;
  }) => {
    setCheckingDuplicates(true);
    
    const duplicates = detectDuplicates({
      title: values.title,
      categoryId: values.categoryId,
      areaId: values.areaId,
      address: values.address,
      contactPhone: values.contactPhone,
    });

    setCheckingDuplicates(false);

    if (duplicates.length > 0) {
      setDuplicateResults(duplicates);
      setPendingSubmitData(values);
      setShowDuplicateModal(true);
    } else {
      doSubmit(values);
    }
  };

  const handleContinueCreate = () => {
    setIsMergedSubmit(false);
    setMergedToComplaint(null);
    if (pendingSubmitData) {
      doSubmit(pendingSubmitData);
    }
    setShowDuplicateModal(false);
    setPendingSubmitData(null);
    setDuplicateResults([]);
    setExpandedSimilarityIndex(null);
  };

  const handleMergeToComplaint = (targetComplaint: Complaint) => {
    Modal.confirm({
      title: '确认合并',
      content: `确定要将您的投诉合并到「${targetComplaint.title}」吗？合并后将作为重复投诉处理，可在进度查询中查看。`,
      okText: '确认合并',
      cancelText: '取消',
      onOk: () => {
        if (pendingSubmitData) {
          const newComplaintResult = submitPublicComplaint({
            title: pendingSubmitData.title,
            content: pendingSubmitData.content,
            categoryId: pendingSubmitData.categoryId,
            categoryName: targetComplaint.categoryName,
            areaId: pendingSubmitData.areaId,
            areaName: targetComplaint.areaName,
            address: pendingSubmitData.address,
            contactName: pendingSubmitData.contactName,
            contactPhone: pendingSubmitData.contactPhone,
            departmentId: targetComplaint.departmentId,
            departmentName: targetComplaint.departmentName,
            assignSource: targetComplaint.assignSource || 'auto',
            dispatchRuleId: targetComplaint.dispatchRuleId,
            dispatchRuleName: targetComplaint.dispatchRuleName,
          });

          mergeComplaint(newComplaintResult.id, targetComplaint.id, '公众提交');

          const updatedTarget = getComplaintById(targetComplaint.id);
          setIsMergedSubmit(true);
          setMergedToComplaint(updatedTarget || targetComplaint);
          setNewComplaint(newComplaintResult);
          setSubmitted(true);
          message.success('投诉已提交并合并到已有投诉');
        }
        setShowDuplicateModal(false);
        setPendingSubmitData(null);
        setDuplicateResults([]);
        setExpandedSimilarityIndex(null);
      },
    });
  };

  const handleQuery = (values: { id: string; phone: string }) => {
    const result = queryComplaintPublic(values.id.toUpperCase(), values.phone);
    if (result) {
      setQueriedComplaint(result);
    } else {
      message.error('未找到相关投诉记录，请核实投诉编号和手机号');
      setQueriedComplaint(null);
    }
  };

  const handleContinueSubmit = () => {
    setSubmitted(false);
    setNewComplaint(null);
    setMatchResult(null);
    setMatchedDept(null);
    setSelectedCatId('c1-1');
    setSelectedAreaId('a1');
    setIsMergedSubmit(false);
    setMergedToComplaint(null);
    submitForm.resetFields();
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'query') {
      setQueriedComplaint(null);
      queryForm.resetFields();
    }
  };

  const getStatusColor = (status: string) => {
    return statusColorMap[status] || 'default';
  };

  const SuccessView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="text-green-500" size={40} />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-1">提交成功</h3>
        <p className="text-gray-500">
          您的投诉建议已成功提交，投诉编号：
          <span className="font-mono text-blue-600 font-semibold">{newComplaint?.id}</span>
        </p>
      </div>

      {isMergedSubmit && mergedToComplaint && (
        <Alert
          type="info"
          showIcon
          icon={<GitMerge size={18} className="text-blue-500" />}
          message="已进入重复投诉组"
          description={
            <div className="space-y-3">
              <p className="text-sm">
                您的投诉已合并至相似投诉组，与
                <span className="font-medium text-gray-800">「{mergedToComplaint.title}」</span>
                （<span className="font-mono text-blue-600">{mergedToComplaint.id}</span>）并案处理。
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-blue-400" />
                  <span className="text-gray-600">
                    组内共 <span className="font-medium text-blue-600">{mergedToComplaint.repeatCount || 2}</span> 件投诉
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-orange-400" />
                  <span className="text-gray-600">
                    主投诉状态：
                    <Tag color={getStatusColor(mergedToComplaint.status)} className="ml-1" style={{ margin: 0 }}>
                      {statusMap[mergedToComplaint.status]}
                    </Tag>
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-blue-50/50 rounded p-2 border border-blue-100">
                <p className="flex items-start gap-1">
                  <Info size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    合并处理可加快问题解决进度，处理结果将统一反馈。您仍可通过本投诉编号（{newComplaint?.id}）查询办理进度。
                  </span>
                </p>
              </div>
            </div>
          }
          className="border-blue-200 bg-blue-50/30"
        />
      )}

      {!isMergedSubmit && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircle size={18} />}
          message="独立投诉工单"
          description="您的投诉已作为独立工单受理，将由责任单位按流程办理。"
          className="border-green-200 bg-green-50/30"
        />
      )}

      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="事项分类">{newComplaint?.categoryName}</Descriptions.Item>
        <Descriptions.Item label="所属区域">{newComplaint?.areaName}</Descriptions.Item>
        <Descriptions.Item label="责任单位" span={2}>
          {newComplaint?.departmentName}
        </Descriptions.Item>
        <Descriptions.Item label="派单方式">
          <Tag color={newComplaint?.assignSource === 'auto' ? 'green' : 'orange'}>
            {newComplaint?.assignSource === 'auto' ? '智能派单' : '人工派单'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="办理状态">
          <Tag color={getStatusColor(newComplaint?.status || '')}>
            {statusMap[newComplaint?.status || '']}
          </Tag>
        </Descriptions.Item>
        {isMergedSubmit && mergedToComplaint && (
          <Descriptions.Item label="重复投诉组" span={2}>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag color="blue" icon={<GitMerge size={10} />}>
                共 {mergedToComplaint.repeatCount || 2} 件
              </Tag>
              <span className="text-xs text-gray-500">
                主投诉：{mergedToComplaint.id}
              </span>
            </div>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="提交时间" span={2}>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-gray-400" />
            {newComplaint?.createdAt}
          </span>
        </Descriptions.Item>
      </Descriptions>

      <div>
        <h4 className="font-medium text-gray-700 mb-3">办理进度</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          {newComplaint && <ComplaintTimeline records={newComplaint.timelines} />}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="primary" block icon={<Send size={16} />} onClick={handleContinueSubmit}>
          继续提交
        </Button>
        <Button block icon={<Search size={16} />} onClick={() => setActiveTab('query')}>
          查看更多进度
        </Button>
      </div>

      <div className="text-center text-gray-400 text-sm">
        您可以随时通过投诉编号和手机号查询办理进度
      </div>
    </div>
  );

  const SubmitForm = () => (
    <Form
      form={submitForm}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ categoryId: 'c1-1', areaId: 'a1' }}
    >
      <Form.Item
        name="title"
        label={
          <span className="flex items-center gap-1">
            <FileText size={14} className="text-blue-500" />
            投诉标题
          </span>
        }
        rules={[{ required: true, message: '请输入投诉标题' }]}
      >
        <Input
          placeholder="请简要描述您的投诉或建议"
          maxLength={100}
          showCount
          className="rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="categoryId"
        label={
          <span className="flex items-center gap-1">
            <ListIcon size={14} className="text-blue-500" />
            事项分类
          </span>
        }
        rules={[{ required: true, message: '请选择事项分类' }]}
      >
        <Select
          placeholder="请选择事项分类"
          className="rounded-lg"
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="children"
          onChange={handleCategoryChange}
        >
          {topLevelCategories.map((top) => (
            <Select.OptGroup key={top.id} label={top.name}>
              {getSubCategories(top.id).map((sub) => (
                <Select.Option key={sub.id} value={sub.id}>
                  {sub.name}
                </Select.Option>
              ))}
            </Select.OptGroup>
          ))}
        </Select>
      </Form.Item>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item
          name="areaId"
          label={
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-blue-500" />
              所属区域
            </span>
          }
          rules={[{ required: true, message: '请选择所属区域' }]}
        >
          <Select
            placeholder="请选择所属区域"
            className="rounded-lg"
            style={{ width: '100%' }}
            onChange={handleAreaChange}
          >
            {areas.map((area) => (
              <Select.Option key={area.id} value={area.id}>
                {area.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="address"
          label={
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-blue-500" />
              详细地址
            </span>
          }
          rules={[{ required: true, message: '请输入详细地址' }]}
        >
          <Input placeholder="请输入详细地址" className="rounded-lg" />
        </Form.Item>
      </div>

      {matchResult && matchResult.matched && matchedDept && (
        <Alert
          message={
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-green-500" />
              <span>
                智能匹配责任单位：<strong>{matchedDept.name}</strong>
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
                暂未匹配到对应责任单位，将由工作人员人工分派
              </span>
            </div>
          }
          type="warning"
          showIcon={false}
          className="mb-4"
        />
      )}

      {matchedDept && (
        <div className="mb-4 p-4 bg-blue-50/60 rounded-lg border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm">
                {matchedDept.name}
              </div>
              <div className="text-xs text-gray-500">
                {matchedDept.type}
              </div>
            </div>
          </div>
          {matchedDept.responsibilities && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <ClipboardList size={11} />
                <span>主要职责</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                {matchedDept.responsibilities}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item
        name="contactName"
        label={
          <span className="flex items-center gap-1">
            <User size={14} className="text-blue-500" />
            联系人
          </span>
        }
        rules={[{ required: true, message: '请输入联系人姓名' }]}
      >
        <Input placeholder="请输入您的姓名" className="rounded-lg" />
      </Form.Item>

      <Form.Item
        name="contactPhone"
        label={
          <span className="flex items-center gap-1">
            <Phone size={14} className="text-blue-500" />
            联系电话
          </span>
        }
        rules={[
          { required: true, message: '请输入联系电话' },
          { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
        ]}
      >
        <Input placeholder="请输入您的手机号" className="rounded-lg" maxLength={11} />
      </Form.Item>
      </div>

      <Form.Item
        name="content"
        label={
          <span className="flex items-center gap-1">
            <AlignLeft size={14} className="text-blue-500" />
            投诉内容
          </span>
        }
        rules={[{ required: true, message: '请输入投诉内容' }]}
      >
        <Input.TextArea
          rows={5}
          placeholder="请详细描述您遇到的问题或建议..."
          maxLength={1000}
          showCount
          className="rounded-lg"
        />
      </Form.Item>

      <Form.Item className="mb-0 mt-6">
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          className="h-12 rounded-lg font-medium text-base bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30"
          icon={<Send size={18} />}
          loading={checkingDuplicates}
        >
          {checkingDuplicates ? '正在检测重复投诉...' : '提交投诉建议'}
        </Button>
      </Form.Item>
    </Form>
  );

  const DuplicateModal = () => {
    const sortedResults = useMemo(() => {
      return [...duplicateResults].sort((a, b) => b.similarity - a.similarity);
    }, [duplicateResults]);

    const getStatusText = (status: string) => {
      const statusTextMap: Record<string, string> = {
        pending_accept: '待受理',
        pending_assign: '待派单',
        processing: '办理中',
        pending_review: '待审核',
        returned: '已退回',
        completed: '已办结',
        overdue: '已逾期',
      };
      return statusTextMap[status] || statusMap[status] || status;
    };

    const getStatusDescription = (status: string) => {
      const descMap: Record<string, string> = {
        pending_accept: '投诉已提交，等待工作人员受理',
        pending_assign: '已受理，等待分派至责任单位',
        processing: '责任单位正在处理中',
        pending_review: '办理完成，等待审核验收',
        returned: '因材料不足等原因被退回',
        completed: '已办结归档',
        overdue: '超出办理时限',
      };
      return descMap[status] || '';
    };

    const getSimilarityDetailItems = (item: DuplicateComplaintResult) => {
      const items: { key: string; label: string; matched: boolean; detail?: string; score: number; weight: number }[] = [];
      const scores = item.detailScores;

      if (scores) {
        items.push({
          key: 'title',
          label: '标题相似',
          matched: scores.title.matched,
          detail: scores.title.detail,
          score: scores.title.score,
          weight: scores.title.weight,
        });
        items.push({
          key: 'category',
          label: '分类匹配',
          matched: scores.category.matched,
          detail: scores.category.detail,
          score: scores.category.score,
          weight: scores.category.weight,
        });
        items.push({
          key: 'area',
          label: '区域相同',
          matched: scores.area.matched,
          detail: scores.area.detail,
          score: scores.area.score,
          weight: scores.area.weight,
        });
        if (scores.address.weight > 0) {
          items.push({
            key: 'address',
            label: '地址相似',
            matched: scores.address.matched,
            detail: scores.address.detail,
            score: scores.address.score,
            weight: scores.address.weight,
          });
        }
        if (scores.phone.weight > 0) {
          items.push({
            key: 'phone',
            label: '联系电话相同',
            matched: scores.phone.matched,
            detail: scores.phone.detail,
            score: scores.phone.score,
            weight: scores.phone.weight,
          });
        }
      } else {
        items.push({
          key: 'title',
          label: '标题相似',
          matched: item.matchReasons.some((r) => r.includes('标题')),
          detail: item.matchReasons.find((r) => r.includes('标题')),
          score: 0,
          weight: 0,
        });
        items.push({
          key: 'category',
          label: '分类相同',
          matched: item.matchReasons.includes('分类相同') || item.matchReasons.includes('同类大分类'),
          detail: item.matchReasons.find((r) => r.includes('分类') || r.includes('同类')),
          score: 0,
          weight: 0,
        });
        items.push({
          key: 'area',
          label: '区域相同',
          matched: item.matchReasons.includes('区域相同'),
          score: 0,
          weight: 0,
        });
        items.push({
          key: 'address',
          label: '地址相似',
          matched: item.matchReasons.some((r) => r.includes('地址')),
          detail: item.matchReasons.find((r) => r.includes('地址')),
          score: 0,
          weight: 0,
        });
        items.push({
          key: 'phone',
          label: '联系电话相同',
          matched: item.matchReasons.includes('联系电话相同'),
          score: 0,
          weight: 0,
        });
      }

      return items;
    };

    return (
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            <span>发现疑似重复投诉</span>
          </div>
        }
        open={showDuplicateModal}
        onCancel={() => {
          setShowDuplicateModal(false);
          setPendingSubmitData(null);
          setDuplicateResults([]);
          setExpandedSimilarityIndex(null);
        }}
        footer={null}
        width={760}
        closeIcon={<X size={18} />}
        destroyOnClose
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            showIcon
            icon={<AlertTriangle size={16} />}
            message={`系统检测到 ${duplicateResults.length} 条疑似重复的投诉记录`}
            description="为提高处理效率，建议您合并到已有投诉。您也可以选择继续创建新投诉。相似度越高的结果越靠前展示。"
          />

          <div className="max-h-[460px] overflow-y-auto pr-1">
            <List
              itemLayout="vertical"
              dataSource={sortedResults}
              renderItem={(item, index) => {
                const level = getSimilarityLevel(item.similarity);
                const color = getSimilarityColor(item.similarity);
                const label = getSimilarityLabel(item.similarity);
                const isExpanded = expandedSimilarityIndex === index;
                const detailItems = getSimilarityDetailItems(item);
                const isHighSimilarity = level === 'high';

                return (
                  <List.Item
                    key={item.complaint.id}
                    className={`rounded-lg mb-3 transition-all ${
                      isHighSimilarity
                        ? 'border-2 border-red-300 bg-red-50/40 shadow-sm'
                        : 'border border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                    }`}
                    style={{ padding: '16px', marginBottom: '12px' }}
                  >
                    <div className="w-full">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {isHighSimilarity && (
                              <Tag color="red" className="m-0">
                                推荐优先合并
                              </Tag>
                            )}
                            <span className="font-medium text-gray-800 truncate">
                              {item.complaint.title}
                            </span>
                            <Tag
                              color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'green'}
                              className="m-0 flex-shrink-0"
                            >
                              {label}
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

                      <div
                        className="mb-3 p-3 bg-white/60 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">
                              当前办理状态
                            </span>
                          </div>
                          <Tag color={statusColorMap[item.complaint.status]} className="m-0">
                            {getStatusText(item.complaint.status)}
                          </Tag>
                        </div>
                        <p className="text-xs text-gray-500 pl-6">
                          {getStatusDescription(item.complaint.status)}
                        </p>
                      </div>

                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedSimilarityIndex(isExpanded ? null : index)}
                      >
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Zap size={12} className="text-orange-400" />
                            相似原因明细
                          </span>
                          <span className="text-blue-500 flex items-center gap-0.5">
                            {isExpanded ? '收起' : '展开查看'}
                            <ChevronRight
                              size={12}
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {item.matchReasons.slice(0, isExpanded ? undefined : 3).map((reason, idx) => (
                            <Tag key={idx} color="blue" className="m-0 text-xs">
                              {reason}
                            </Tag>
                          ))}
                          {!isExpanded && item.matchReasons.length > 3 && (
                            <Tag className="m-0 text-xs bg-gray-100 text-gray-500 border-gray-200">
                              +{item.matchReasons.length - 3} 项
                            </Tag>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                            <div className="text-xs text-gray-500 mb-1">
                              各维度相似度得分（权重占比）
                            </div>
                            {detailItems.map((detail) => (
                              <div key={detail.key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {detail.matched ? (
                                      <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                                    ) : (
                                      <XCircle size={12} className="text-gray-300 flex-shrink-0" />
                                    )}
                                    <span className={detail.matched ? 'text-gray-700' : 'text-gray-400'}>
                                      {detail.label}
                                    </span>
                                    {detail.detail && (
                                      <span className="text-gray-400">（{detail.detail}）</span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-medium text-gray-600">
                                      {Math.round(detail.score * 100)}%
                                    </span>
                                    {detail.weight > 0 && (
                                      <span className="text-gray-400 ml-1">
                                        / 权重 {Math.round(detail.weight * 100)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {detail.weight > 0 && (
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                      className="h-1.5 rounded-full transition-all"
                                      style={{
                                        width: `${detail.score * 100}%`,
                                        backgroundColor: detail.matched
                                          ? detail.score >= 0.6
                                            ? '#ef4444'
                                            : '#f97316'
                                          : '#e5e7eb',
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">综合相似度</span>
                                <span className="font-bold text-orange-600">
                                  {Math.round(item.similarity * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          投诉人：{item.complaint.contactName}
                        </div>
                        <Button
                          type="primary"
                          size="small"
                          icon={<GitMerge size={14} />}
                          onClick={() => handleMergeToComplaint(item.complaint)}
                        >
                          合并到此投诉
                        </Button>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <Button
              block
              icon={<Plus size={16} />}
              onClick={handleContinueCreate}
            >
              继续创建新投诉
            </Button>
            <Button
              type="primary"
              block
              icon={<GitMerge size={16} />}
              onClick={() => {
                if (sortedResults.length > 0) {
                  handleMergeToComplaint(sortedResults[0].complaint);
                }
              }}
            >
              合并到最高相似度投诉
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  const QueryForm = () => (
    <div className="space-y-6">
      {!queriedComplaint && (
        <Form form={queryForm} layout="vertical" onFinish={handleQuery}>
          <Form.Item
            name="id"
            label={
              <span className="flex items-center gap-1">
                <FileText size={14} className="text-blue-500" />
                投诉编号
              </span>
            }
            rules={[{ required: true, message: '请输入投诉编号' }]}
          >
            <Input
              placeholder="请输入投诉编号，如 C00061"
              className="rounded-lg"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={
              <span className="flex items-center gap-1">
                <Phone size={14} className="text-blue-500" />
                联系电话
              </span>
            }
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input
              placeholder="请输入提交时填写的手机号"
              className="rounded-lg"
              size="large"
              maxLength={11}
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              className="h-12 rounded-lg font-medium text-base bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30"
              icon={<Search size={18} />}
            >
              查询进度
            </Button>
          </Form.Item>
        </Form>
      )}

      {queriedComplaint && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              type="text"
              icon={<Home size={16} />}
              onClick={() => {
                setQueriedComplaint(null);
                queryForm.resetFields();
              }}
              className="text-gray-600 p-0"
            >
              返回查询
            </Button>
            <Tag color={getStatusColor(queriedComplaint.status)}>
              {statusMap[queriedComplaint.status]}
            </Tag>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {queriedComplaint.title}
            </h3>
            <p className="text-sm text-gray-500">
              投诉编号：
              <span className="font-mono text-blue-600">{queriedComplaint.id}</span>
            </p>
          </div>

          {queriedComplaint.isRepeat && queriedComplaint.repeatGroupId && (
            <Alert
              type="info"
              showIcon
              icon={<GitMerge size={18} className="text-blue-500" />}
              message="重复投诉组"
              description={`该投诉属于重复投诉组，当前组内共有 ${queriedComplaint.repeatCount || 2} 件投诉并案处理。`}
              className="border-blue-200 bg-blue-50/50"
            />
          )}

          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="事项分类">
              {queriedComplaint.categoryName}
            </Descriptions.Item>
            <Descriptions.Item label="所属区域">
              {queriedComplaint.areaName}
            </Descriptions.Item>
            <Descriptions.Item label="责任单位" span={2}>
              {queriedComplaint.departmentName}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                {queriedComplaint.createdAt}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="办理时限">
              {queriedComplaint.deadline}
            </Descriptions.Item>
            {queriedComplaint.isRepeat && (
              <Descriptions.Item label="重复投诉" span={2}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag color="blue" icon={<GitMerge size={10} />}>
                    组内共 {queriedComplaint.repeatCount || 2} 件
                  </Tag>
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>

          <div>
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              投诉内容
            </h4>
            <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
              {queriedComplaint.content}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <User size={16} className="text-blue-500" />
              办理时间线
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ComplaintTimeline records={queriedComplaint.timelines} />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-center text-gray-400 text-sm">
              如有疑问，请拨打服务热线：12345
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'submit',
      label: (
        <span className="flex items-center gap-2">
        <Send size={16} />
        提交投诉
      </span>
      ),
      children: submitted ? <SuccessView /> : <SubmitForm />,
    },
    {
      key: 'query',
      label: (
        <span className="flex items-center gap-2">
          <Search size={16} />
          进度查询
        </span>
      ),
      children: <QueryForm />,
    },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-300 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-400 blur-3xl opacity-20"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">城</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">公众投诉建议平台</h1>
          <p className="text-blue-200 text-sm">共建美好城市，您的建议我们认真对待</p>
        </div>

        <Card
          className="backdrop-blur-lg bg-white/95 shadow-2xl border-0 rounded-2xl"
          styles={{ body: { padding: '32px' } }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            centered
            className="mb-0"
          />

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-sm">
              已有管理账号？
              <Button
                type="link"
                size="small"
                className="text-blue-500 h-auto p-0"
                onClick={() => navigate('/login')}
              >
                前往管理后台登录
              </Button>
            </p>
          </div>
        </Card>

        <div className="text-center mt-6 text-blue-200 text-xs">
          © 2024 城市治理投诉建议闭环平台 版权所有
        </div>
      </div>

      <DuplicateModal />
    </div>
  );
};

export default PublicSubmit;
