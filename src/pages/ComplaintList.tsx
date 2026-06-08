import { useMemo, useState } from 'react';
import {
  Alert,
  Table,
  List,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  Row,
  Col,
  message,
} from 'antd';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Bell,
  GitMerge,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore, type BackendComplaintForm } from '@/store/appStore';
import type { Complaint, ComplaintSource, ComplaintStatus, DuplicateComplaintResult } from '@/types';
import { StatusTag, SourceTag, SatisfactionTag } from '@/components/StatusTags';
import { categories, areas, departments, statusMap, sourceMap } from '@/data/dictionaries';
import { getSimilarityColor, getSimilarityLabel, matchDispatchRule } from '@/lib/utils';

const ComplaintList: React.FC = () => {
  const navigate = useNavigate();
  const {
    complaints,
    dispatchRules,
    updateComplaint,
    addTimeline,
    submitBackendComplaint,
    detectDuplicates,
    mergeComplaint,
  } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm<BackendComplaintForm>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedAreaId, setSelectedAreaId] = useState<string>();
  const [pendingSubmitData, setPendingSubmitData] = useState<BackendComplaintForm | null>(null);
  const [submitDuplicateResults, setSubmitDuplicateResults] = useState<DuplicateComplaintResult[]>([]);
  const [submitDuplicateModalVisible, setSubmitDuplicateModalVisible] = useState(false);

  const [filters, setFilters] = useState({
    keyword: '',
    source: undefined as ComplaintSource | undefined,
    status: undefined as ComplaintStatus | undefined,
    categoryId: undefined,
    areaId: undefined,
    departmentId: undefined,
  });

  const filteredComplaints = complaints.filter((c) => {
    if (filters.keyword && !c.title.includes(filters.keyword) && !c.id.includes(filters.keyword)) {
      return false;
    }
    if (filters.source && c.source !== filters.source) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.categoryId && !c.categoryId.startsWith(filters.categoryId)) return false;
    if (filters.areaId && c.areaId !== filters.areaId) return false;
    if (filters.departmentId && c.departmentId !== filters.departmentId) return false;
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
      width: 240,
      ellipsis: true,
      render: (title, record) => (
        <div>
          <span className="text-gray-800">{title}</span>
          {record.isRepeat && (
            <span className="ml-2 text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
              重复投诉{record.repeatCount ? `(${record.repeatCount}件)` : ''}
            </span>
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
      width: 180,
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

  const dispatchPreview = useMemo(() => {
    if (!selectedCategoryId || !selectedAreaId) return null;
    const match = matchDispatchRule(dispatchRules, categories, selectedCategoryId, selectedAreaId);
    const department = departments.find((item) => item.id === match.rule?.departmentId);
    return {
      match,
      department,
    };
  }, [dispatchRules, selectedAreaId, selectedCategoryId]);

  const resetBackendForm = () => {
    form.resetFields();
    setSelectedCategoryId(undefined);
    setSelectedAreaId(undefined);
    setPendingSubmitData(null);
    setSubmitDuplicateResults([]);
    setSubmitDuplicateModalVisible(false);
  };

  const closeBackendModal = () => {
    setIsModalVisible(false);
    resetBackendForm();
  };

  const finishSubmit = (values: BackendComplaintForm) => {
    const complaint = submitBackendComplaint(values);
    if (complaint.dispatchSource === 'rule') {
      message.success('投诉已录入，系统已按规则自动派单');
    } else if (complaint.dispatchSource === 'manual') {
      message.success('投诉已录入，已按人工选择派单');
    } else {
      message.warning('投诉已录入，未匹配到派单规则，请后续人工选择责任单位');
    }
    setIsModalVisible(false);
    resetBackendForm();
  };

  const handleSubmit = (values: BackendComplaintForm) => {
    const duplicates = detectDuplicates({
      title: values.title,
      categoryId: values.categoryId,
      areaId: values.areaId,
      address: values.address,
      contactPhone: values.contactPhone,
    });

    if (duplicates.length > 0) {
      setPendingSubmitData(values);
      setSubmitDuplicateResults(duplicates);
      setSubmitDuplicateModalVisible(true);
      return;
    }

    finishSubmit(values);
  };

  const handleContinueCreate = () => {
    if (pendingSubmitData) finishSubmit(pendingSubmitData);
  };

  const handleMergeToComplaint = (targetComplaint: Complaint) => {
    if (!pendingSubmitData) return;
    const complaint = submitBackendComplaint(pendingSubmitData);
    mergeComplaint(complaint.id, targetComplaint.id, '后台录入');
    message.success(`已合并到投诉 ${targetComplaint.id}`);
    setIsModalVisible(false);
    resetBackendForm();
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      source: undefined,
      status: undefined,
      categoryId: undefined,
      areaId: undefined,
      departmentId: undefined,
    });
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
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
        onCancel={closeBackendModal}
        footer={null}
        width={700}
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
                <Select
                  placeholder="请选择分类"
                  onChange={(value) => {
                    setSelectedCategoryId(value);
                    form.setFieldsValue({ departmentId: undefined });
                  }}
                >
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
                <Select
                  placeholder="请选择区域"
                  onChange={(value) => {
                    setSelectedAreaId(value);
                    form.setFieldsValue({ departmentId: undefined });
                  }}
                >
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
                label="责任单位"
                name="departmentId"
                extra={dispatchPreview?.department ? '已匹配到规则时会优先使用规则派单，无需人工选择。' : '未匹配到规则时可人工选择责任单位；不选择则进入待派单。'}
              >
                <Select placeholder="请选择责任单位">
                  {departments.map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {selectedCategoryId && selectedAreaId && (
            <Alert
              className="mb-4"
              type={dispatchPreview?.department ? 'success' : 'warning'}
              showIcon
              message={
                dispatchPreview?.department
                  ? `已匹配规则：${dispatchPreview.match.rule?.name}，将自动派单至${dispatchPreview.department.name}`
                  : '未匹配到派单规则，请人工选择责任单位或提交为待派单'
              }
            />
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
              <Button onClick={closeBackendModal}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <GitMerge size={18} className="text-orange-500" />
            <span>疑似重复投诉</span>
          </Space>
        }
        open={submitDuplicateModalVisible}
        onCancel={() => setSubmitDuplicateModalVisible(false)}
        width={760}
        footer={[
          <Button key="cancel" onClick={() => setSubmitDuplicateModalVisible(false)}>
            返回修改
          </Button>,
          <Button key="continue" type="primary" onClick={handleContinueCreate}>
            继续创建新投诉
          </Button>,
        ]}
      >
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message={`检测到 ${submitDuplicateResults.length} 条疑似重复投诉`}
          description="请选择合并到已有投诉，或继续创建新投诉。"
        />
        <List
          dataSource={submitDuplicateResults}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="merge"
                  type="primary"
                  size="small"
                  onClick={() => handleMergeToComplaint(item.complaint)}
                >
                  合并到此
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <span>{item.complaint.title}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ color: getSimilarityColor(item.similarity), background: '#fff7e6' }}
                    >
                      {getSimilarityLabel(item.similarity)} {Math.round(item.similarity * 100)}%
                    </span>
                    {item.complaint.repeatCount && (
                      <span className="text-xs text-orange-500">重复{item.complaint.repeatCount}件</span>
                    )}
                  </Space>
                }
                description={
                  <div className="space-y-1 text-sm text-gray-500">
                    <div>
                      {item.complaint.id} · {item.complaint.areaName} · {item.complaint.categoryName}
                    </div>
                    <div>{item.complaint.address || '无详细地址'} · {item.complaint.contactPhone}</div>
                    <Space size={[4, 4]} wrap>
                      {item.matchReasons.map((reason) => (
                        <span key={reason} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {reason}
                        </span>
                      ))}
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default ComplaintList;
