import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, List, Modal, Row, Select, Space, Typography, message } from 'antd';
import { ArrowLeft, FileText, GitMerge, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, type PublicComplaintForm } from '@/store/appStore';
import type { Complaint, DuplicateComplaintResult } from '@/types';
import { areas, categories, departments } from '@/data/dictionaries';
import ComplaintTimeline from '@/components/ComplaintTimeline';
import { getSimilarityColor, getSimilarityLabel, matchDispatchRule } from '@/lib/utils';

const { TextArea } = Input;

const PublicSubmit: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<PublicComplaintForm>();
  const submitPublicComplaint = useAppStore((state) => state.submitPublicComplaint);
  const detectDuplicates = useAppStore((state) => state.detectDuplicates);
  const mergeComplaint = useAppStore((state) => state.mergeComplaint);
  const dispatchRules = useAppStore((state) => state.dispatchRules);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedAreaId, setSelectedAreaId] = useState<string>();
  const [pendingSubmitData, setPendingSubmitData] = useState<PublicComplaintForm | null>(null);
  const [duplicateResults, setDuplicateResults] = useState<DuplicateComplaintResult[]>([]);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);

  const parentCategories = categories.filter((category) => !category.parentId);
  const dispatchPreview = useMemo(() => {
    if (!selectedCategoryId || !selectedAreaId) return null;
    const match = matchDispatchRule(dispatchRules, categories, selectedCategoryId, selectedAreaId);
    const department = departments.find((item) => item.id === match.rule?.departmentId);
    return { match, department };
  }, [dispatchRules, selectedAreaId, selectedCategoryId]);

  const resetSubmitState = () => {
    form.resetFields();
    setSelectedCategoryId(undefined);
    setSelectedAreaId(undefined);
    setPendingSubmitData(null);
    setDuplicateResults([]);
    setDuplicateModalVisible(false);
  };

  const finishSubmit = (values: PublicComplaintForm) => {
    const complaint = submitPublicComplaint(values);
    setSubmittedComplaint(complaint);
    resetSubmitState();
    if (complaint.dispatchSource === 'rule') {
      message.success('提交成功，已自动受理并按规则派单');
    } else {
      message.warning('提交成功，未匹配到派单规则，后台将人工选择责任单位');
    }
  };

  const handleSubmit = (values: PublicComplaintForm) => {
    const duplicates = detectDuplicates({
      title: values.title,
      categoryId: values.categoryId,
      areaId: values.areaId,
      address: values.address,
      contactPhone: values.contactPhone,
    });

    if (duplicates.length > 0) {
      setPendingSubmitData(values);
      setDuplicateResults(duplicates);
      setDuplicateModalVisible(true);
      return;
    }

    finishSubmit(values);
  };

  const handleContinueCreate = () => {
    if (pendingSubmitData) finishSubmit(pendingSubmitData);
  };

  const handleMergeToComplaint = (targetComplaint: Complaint) => {
    if (!pendingSubmitData) return;
    const complaint = submitPublicComplaint(pendingSubmitData);
    mergeComplaint(complaint.id, targetComplaint.id, '公众提交');
    setSubmittedComplaint(useAppStore.getState().getComplaintById(complaint.id) || complaint);
    resetSubmitState();
    message.success('提交成功，已合并到已有投诉');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">公众提交入口</h1>
              <p className="text-sm text-gray-500">城市治理投诉建议平台</p>
            </div>
          </div>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/login')}>
            返回登录
          </Button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={submittedComplaint ? 14 : 24}>
            <Card className="shadow-sm" title="填写投诉建议">
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="标题"
                      name="title"
                      rules={[{ required: true, message: '请输入标题' }]}
                    >
                      <Input placeholder="请输入投诉建议标题" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="事项分类"
                      name="categoryId"
                      rules={[{ required: true, message: '请选择事项分类' }]}
                    >
                      <Select placeholder="请选择事项分类" onChange={setSelectedCategoryId}>
                        {parentCategories.map((category) => (
                          <Select.OptGroup key={category.id} label={category.name}>
                            {categories
                              .filter((item) => item.parentId === category.id)
                              .map((subCategory) => (
                                <Select.Option key={subCategory.id} value={subCategory.id}>
                                  {subCategory.name}
                                </Select.Option>
                              ))}
                          </Select.OptGroup>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="所属区域"
                      name="areaId"
                      rules={[{ required: true, message: '请选择所属区域' }]}
                    >
                      <Select placeholder="请选择所属区域" onChange={setSelectedAreaId}>
                        {areas.map((area) => (
                          <Select.Option key={area.id} value={area.id}>
                            {area.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="详细地址"
                      name="address"
                      rules={[{ required: true, message: '请输入详细地址' }]}
                    >
                      <Input placeholder="请输入详细地址" />
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
                        ? `系统将按规则“${dispatchPreview.match.rule?.name}”派单至${dispatchPreview.department.name}`
                        : '暂未匹配到派单规则，提交后将进入待派单并由后台人工选择责任单位'
                    }
                  />
                )}

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="联系人"
                      name="contactName"
                      rules={[{ required: true, message: '请输入联系人' }]}
                    >
                      <Input placeholder="请输入联系人姓名" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="联系电话"
                      name="contactPhone"
                      rules={[
                        { required: true, message: '请输入联系电话' },
                        { pattern: /^1\d{10}$|^0\d{2,3}-?\d{7,8}$/, message: '请输入有效联系电话' },
                      ]}
                    >
                      <Input placeholder="请输入联系电话" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="投诉内容"
                  name="content"
                  rules={[{ required: true, message: '请输入投诉内容' }]}
                >
                  <TextArea rows={6} placeholder="请详细描述投诉建议内容" />
                </Form.Item>

                <Form.Item className="mb-0">
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<Send size={16} />}>
                      提交
                    </Button>
                    <Button
                      onClick={() => {
                        resetSubmitState();
                      }}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {submittedComplaint && (
            <Col xs={24} lg={10}>
              <Card className="shadow-sm" title="提交结果">
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <p className="text-sm text-gray-500 mb-1">受理编号</p>
                    <Typography.Text className="text-blue-700 font-mono text-lg">
                      {submittedComplaint.id}
                    </Typography.Text>
                    <p className="text-sm text-gray-600 mt-2">
                      已写入当前投诉列表，后台可在投诉列表中查看。
                    </p>
                  </div>
                  <ComplaintTimeline records={submittedComplaint.timelines} />
                </div>
              </Card>
            </Col>
          )}
        </Row>
      </main>

      <Modal
        title={
          <Space>
            <GitMerge size={18} className="text-orange-500" />
            <span>发现疑似重复投诉</span>
          </Space>
        }
        open={duplicateModalVisible}
        onCancel={() => setDuplicateModalVisible(false)}
        width={760}
        footer={[
          <Button key="cancel" onClick={() => setDuplicateModalVisible(false)}>
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
          message={`系统检测到 ${duplicateResults.length} 条疑似重复投诉`}
          description="可选择合并到已有投诉，也可以继续创建新投诉。"
        />
        <List
          dataSource={duplicateResults}
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

export default PublicSubmit;
