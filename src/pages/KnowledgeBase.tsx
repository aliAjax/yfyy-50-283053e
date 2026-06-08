import { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  Row,
  Col,
  message,
  Tag,
  Card,
  Divider,
} from 'antd';
import {
  Plus,
  Search,
  Edit3,
  BookOpen,
  Eye,
  X,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { KnowledgeEntry, KnowledgeStatus } from '@/types';
import { categories, departments } from '@/data/dictionaries';

const KnowledgeBase: React.FC = () => {
  const { knowledgeEntries, addKnowledgeEntry, updateKnowledgeEntry, toggleKnowledgeStatus } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<KnowledgeEntry | null>(null);
  const [form] = Form.useForm();

  const [filters, setFilters] = useState({
    keyword: '',
    categoryId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
    status: undefined as KnowledgeStatus | undefined,
  });

  const filteredEntries = knowledgeEntries.filter((k) => {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      const matchTitle = k.title.toLowerCase().includes(keyword);
      const matchContent = k.content.toLowerCase().includes(keyword);
      const matchKeywords = k.keywords.some(kw => kw.toLowerCase().includes(keyword));
      if (!matchTitle && !matchContent && !matchKeywords) return false;
    }
    if (filters.categoryId && !k.categoryId.startsWith(filters.categoryId)) return false;
    if (filters.departmentId && k.departmentId !== filters.departmentId) return false;
    if (filters.status && k.status !== filters.status) return false;
    return true;
  });

  const handleAdd = () => {
    setEditingEntry(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleView = (record: KnowledgeEntry) => {
    setViewingEntry(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: KnowledgeEntry) => {
    setEditingEntry(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      categoryId: record.categoryId,
      departmentId: record.departmentId,
      keywords: record.keywords.join('，'),
    });
    setIsModalVisible(true);
  };

  const handleSubmit = (values: {
    title: string;
    content: string;
    categoryId: string;
    departmentId: string;
    keywords: string;
  }) => {
    const category = categories.find(c => c.id === values.categoryId);
    const parentCategory = categories.find(c => c.id === category?.parentId);
    const department = departments.find(d => d.id === values.departmentId);
    const keywordList = values.keywords
      .split(/[，,]/)
      .map(k => k.trim())
      .filter(k => k);

    if (editingEntry) {
      updateKnowledgeEntry(editingEntry.id, {
        title: values.title,
        content: values.content,
        categoryId: values.categoryId,
        categoryName: `${parentCategory?.name || ''} - ${category?.name || ''}`,
        departmentId: values.departmentId,
        departmentName: department?.name || '',
        keywords: keywordList,
      });
      message.success('编辑成功');
    } else {
      addKnowledgeEntry({
        title: values.title,
        content: values.content,
        categoryId: values.categoryId,
        categoryName: `${parentCategory?.name || ''} - ${category?.name || ''}`,
        departmentId: values.departmentId,
        departmentName: department?.name || '',
        keywords: keywordList,
        status: 'active',
        creator: '管理员',
      });
      message.success('新增成功');
    }

    setIsModalVisible(false);
    form.resetFields();
  };

  const handleToggleStatus = (id: string, currentStatus: KnowledgeStatus) => {
    toggleKnowledgeStatus(id);
    message.success(currentStatus === 'active' ? '已停用' : '已启用');
  };

  const columns: ColumnsType<KnowledgeEntry> = [
    {
      title: '编号',
      dataIndex: 'id',
      width: 100,
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
      render: (title: string, record) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleView(record)}
        >
          <BookOpen size={16} className="text-blue-500 flex-shrink-0" />
          <span className="text-gray-800 font-medium">{title}</span>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '责任单位',
      dataIndex: 'departmentName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      width: 200,
      render: (keywords: string[]) => (
        <Space wrap size={[4, 4]}>
          {keywords.slice(0, 3).map((kw, idx) => (
            <Tag key={idx} color="blue" className="m-0">
              {kw}
            </Tag>
          ))}
          {keywords.length > 3 && <Tag> +{keywords.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 90,
      align: 'center',
      render: (count) => (
        <span className={count > 20 ? 'text-orange-500 font-medium' : 'text-gray-600'}>
          {count} 次
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      render: (status: KnowledgeStatus) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      width: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Edit3 size={14} />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger={record.status === 'active'}
            onClick={() => handleToggleStatus(record.id, record.status)}
          >
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  const parentCategories = categories.filter(c => !c.parentId);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12} md={8} lg={6}>
            <div className="text-sm text-gray-600 mb-1.5">关键词</div>
            <Input
              placeholder="搜索标题、内容、关键词"
              prefix={<Search size={16} className="text-gray-400" />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <div className="text-sm text-gray-600 mb-1.5">事项分类</div>
            <Select
              placeholder="请选择分类"
              value={filters.categoryId}
              onChange={(value) => setFilters({ ...filters, categoryId: value })}
              allowClear
              style={{ width: '100%' }}
            >
              {parentCategories.map((cat) => {
                const children = categories.filter(c => c.parentId === cat.id);
                if (children.length === 0) {
                  return (
                    <Select.Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Select.Option>
                  );
                }
                return (
                  <Select.OptGroup key={cat.id} label={cat.name}>
                    {children.map((child) => (
                      <Select.Option key={child.id} value={child.id}>
                        {child.name}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                );
              })}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <div className="text-sm text-gray-600 mb-1.5">责任单位</div>
            <Select
              placeholder="请选择责任单位"
              value={filters.departmentId}
              onChange={(value) => setFilters({ ...filters, departmentId: value })}
              allowClear
              style={{ width: '100%' }}
            >
              {departments.map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <div className="text-sm text-gray-600 mb-1.5">状态</div>
            <Select
              placeholder="全部状态"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="disabled">停用</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Space>
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={handleAdd}
              >
                新增条目
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">
            共 <span className="text-blue-600 font-medium">{filteredEntries.length}</span> 条知识条目
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filteredEntries}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingEntry ? '编辑知识条目' : '新增知识条目'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入知识条目标题" maxLength={100} showCount />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="事项分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {parentCategories.map((cat) => {
                    const children = categories.filter(c => c.parentId === cat.id);
                    return (
                      <Select.OptGroup key={cat.id} label={cat.name}>
                        {children.map((child) => (
                          <Select.Option key={child.id} value={child.id}>
                            {child.name}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="责任单位"
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
            </Col>
          </Row>
          <Form.Item
            label="关键词"
            name="keywords"
            rules={[{ required: true, message: '请输入关键词，多个用逗号分隔' }]}
            extra="多个关键词用中文或英文逗号分隔"
          >
            <Input placeholder="例如：占道经营,摆摊,市容" />
          </Form.Item>
          <Form.Item
            label="处理口径内容"
            name="content"
            rules={[{ required: true, message: '请输入处理口径内容' }]}
          >
            <Input.TextArea
              rows={8}
              placeholder="请输入详细的处理口径内容，包括处理措施、流程、回复话术等"
              showCount
              maxLength={2000}
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEntry ? '保存修改' : '确认新增'}
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-500" />
            <span>知识条目详情</span>
          </div>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={680}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        {viewingEntry && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {viewingEntry.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="font-mono text-blue-600">{viewingEntry.id}</span>
                <Tag color={viewingEntry.status === 'active' ? 'green' : 'default'}>
                  {viewingEntry.status === 'active' ? '启用中' : '已停用'}
                </Tag>
                <span>使用 {viewingEntry.usageCount} 次</span>
              </div>
            </div>

            <Divider className="my-0" />

            <Row gutter={[16, 12]}>
              <Col span={12}>
                <div className="text-sm text-gray-500 mb-1">事项分类</div>
                <div className="text-gray-800">{viewingEntry.categoryName}</div>
              </Col>
              <Col span={12}>
                <div className="text-sm text-gray-500 mb-1">责任单位</div>
                <div className="text-gray-800">{viewingEntry.departmentName}</div>
              </Col>
              <Col span={12}>
                <div className="text-sm text-gray-500 mb-1">创建人</div>
                <div className="text-gray-800">{viewingEntry.creator}</div>
              </Col>
              <Col span={12}>
                <div className="text-sm text-gray-500 mb-1">更新时间</div>
                <div className="text-gray-800">{viewingEntry.updatedAt}</div>
              </Col>
            </Row>

            <div>
              <div className="text-sm text-gray-500 mb-2">关键词</div>
              <Space wrap size={[6, 6]}>
                {viewingEntry.keywords.map((kw, idx) => (
                  <Tag key={idx} color="blue">
                    {kw}
                  </Tag>
                ))}
              </Space>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-2">处理口径内容</div>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {viewingEntry.content}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setDetailVisible(false)}>关闭</Button>
              <Button
                type="primary"
                icon={<Edit3 size={14} />}
                onClick={() => {
                  setDetailVisible(false);
                  handleEdit(viewingEntry);
                }}
              >
                编辑
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
