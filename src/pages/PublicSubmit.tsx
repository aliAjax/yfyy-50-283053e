import { useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Space, Typography, message } from 'antd';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, type PublicComplaintForm } from '@/store/appStore';
import type { Complaint } from '@/types';
import { areas, categories } from '@/data/dictionaries';
import ComplaintTimeline from '@/components/ComplaintTimeline';

const { TextArea } = Input;

const PublicSubmit: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<PublicComplaintForm>();
  const submitPublicComplaint = useAppStore((state) => state.submitPublicComplaint);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  const parentCategories = categories.filter((category) => !category.parentId);

  const handleSubmit = (values: PublicComplaintForm) => {
    const complaint = submitPublicComplaint(values);
    setSubmittedComplaint(complaint);
    form.resetFields();
    message.success('提交成功，已自动受理并派单');
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
                      <Select placeholder="请选择事项分类">
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
                      <Select placeholder="请选择所属区域">
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
                    <Button onClick={() => form.resetFields()}>重置</Button>
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
    </div>
  );
};

export default PublicSubmit;
