import { useMemo, useState } from 'react';
import {
  Button,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit, Eye, Plus, Search } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { KnowledgeEntry } from '@/types';
import { categories, departments } from '@/data/dictionaries';

interface KnowledgeFormValues {
  title: string;
  categoryId: string;
  departmentId: string;
  content: string;
  keywords?: string;
  status: boolean;
}

const getCategoryName = (categoryId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  const parent = categories.find((item) => item.id === category?.parentId);
  return parent ? `${parent.name} - ${category?.name || ''}` : category?.name || '';
};

const KnowledgeBase: React.FC = () => {
  const { knowledgeEntries, addKnowledgeEntry, updateKnowledgeEntry } = useAppStore();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const [filters, setFilters] = useState({
    keyword: '',
    categoryId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
    status: undefined as KnowledgeEntry['status'] | undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<KnowledgeEntry | null>(null);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.parentId)
        .map((category) => ({
          label: getCategoryName(category.id),
          value: category.id,
        })),
    []
  );

  const filteredEntries = knowledgeEntries.filter((entry) => {
    const keyword = filters.keyword.trim();
    if (
      keyword &&
      !entry.title.includes(keyword) &&
      !entry.code.includes(keyword) &&
      !entry.content.includes(keyword) &&
      !entry.keywords.some((item) => item.includes(keyword))
    ) {
      return false;
    }
    if (filters.categoryId && entry.categoryId !== filters.categoryId) return false;
    if (filters.departmentId && entry.departmentId !== filters.departmentId) return false;
    if (filters.status && entry.status !== filters.status) return false;
    return true;
  });

  const openCreateModal = () => {
    setEditingEntry(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setModalVisible(true);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      title: entry.title,
      categoryId: entry.categoryId,
      departmentId: entry.departmentId,
      content: entry.content,
      keywords: entry.keywords.join('，'),
      status: entry.status === 'active',
    });
    setModalVisible(true);
  };

  const openDetailModal = (entry: KnowledgeEntry) => {
    setViewingEntry(entry);
    setDetailVisible(true);
  };

  const handleSubmit = (values: KnowledgeFormValues) => {
    const department = departments.find((item) => item.id === values.departmentId);
    const payload = {
      title: values.title,
      categoryId: values.categoryId,
      categoryName: getCategoryName(values.categoryId),
      departmentId: values.departmentId,
      departmentName: department?.name || '',
      content: values.content,
      keywords: (values.keywords || '')
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      status: values.status ? 'active' as const : 'inactive' as const,
      creator: editingEntry?.creator || '系统管理员',
    };

    if (editingEntry) {
      updateKnowledgeEntry(editingEntry.id, payload);
      message.success('知识条目已更新');
    } else {
      addKnowledgeEntry(payload);
      message.success('知识条目已新增');
    }
    setModalVisible(false);
    form.resetFields();
  };

  const toggleStatus = (entry: KnowledgeEntry) => {
    updateKnowledgeEntry(entry.id, {
      status: entry.status === 'active' ? 'inactive' : 'active',
    });
    message.success(entry.status === 'active' ? '已停用模板' : '已启用模板');
  };

  const columns: ColumnsType<KnowledgeEntry> = [
    {
      title: '模板标题',
      dataIndex: 'title',
      width: 240,
      fixed: 'left',
      render: (title, record) => (
        <button
          type="button"
          className="text-left text-blue-600 hover:text-blue-700"
          onClick={() => openDetailModal(record)}
        >
          <div className="font-medium">{title}</div>
          <div className="text-xs text-gray-400 font-mono">{record.code}</div>
        </button>
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
      width: 180,
      ellipsis: true,
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      width: 220,
      render: (keywords: string[]) => (
        <Space size={[0, 4]} wrap>
          {keywords.slice(0, 3).map((keyword) => (
            <Tag key={keyword}>{keyword}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 100,
      sorter: (a, b) => a.usageCount - b.usageCount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: KnowledgeEntry['status']) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<Eye size={14} />} onClick={() => openDetailModal(record)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<Edit size={14} />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => toggleStatus(record)}>
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={7}>
            <Input
              placeholder="搜索标题、编号、内容或关键词"
              prefix={<Search size={16} className="text-gray-400" />}
              value={filters.keyword}
              onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
              allowClear
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              placeholder="事项分类"
              allowClear
              style={{ width: '100%' }}
              value={filters.categoryId}
              onChange={(value) => setFilters({ ...filters, categoryId: value })}
              options={categoryOptions}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              placeholder="责任单位"
              allowClear
              style={{ width: '100%' }}
              value={filters.departmentId}
              onChange={(value) => setFilters({ ...filters, departmentId: value })}
              options={departments.map((department) => ({
                label: department.name,
                value: department.id,
              }))}
            />
          </Col>
          <Col xs={24} md={3}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              options={[
                { label: '启用', value: 'active' },
                { label: '停用', value: 'inactive' },
              ]}
            />
          </Col>
          <Col xs={24} md={4} className="text-right">
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
              新增模板
            </Button>
          </Col>
        </Row>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredEntries}
        scroll={{ x: 1350 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条模板`,
        }}
      />

      <Modal
        title={editingEntry ? '编辑知识模板' : '新增知识模板'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: true }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="模板标题"
                name="title"
                rules={[{ required: true, message: '请输入模板标题' }]}
              >
                <Input placeholder="请输入模板标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="事项分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择事项分类' }]}
              >
                <Select placeholder="请选择事项分类" options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="责任单位"
                name="departmentId"
                rules={[{ required: true, message: '请选择责任单位' }]}
              >
                <Select
                  placeholder="请选择责任单位"
                  options={departments.map((department) => ({
                    label: department.name,
                    value: department.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="关键词" name="keywords">
            <Input placeholder="多个关键词用逗号分隔" />
          </Form.Item>
          <Form.Item
            label="办理结果模板"
            name="content"
            rules={[{ required: true, message: '请输入办理结果模板' }]}
          >
            <Input.TextArea rows={7} placeholder="请输入可复用的办理结果口径" />
          </Form.Item>
          <Form.Item label="启用状态" name="status" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="模板详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          viewingEntry ? (
            <Space>
              <Button onClick={() => setDetailVisible(false)}>关闭</Button>
              <Button
                type="primary"
                onClick={() => {
                  setDetailVisible(false);
                  openEditModal(viewingEntry);
                }}
              >
                编辑模板
              </Button>
            </Space>
          ) : null
        }
        width={760}
      >
        {viewingEntry && (
          <div className="space-y-4">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="模板标题" span={2}>
                {viewingEntry.title}
              </Descriptions.Item>
              <Descriptions.Item label="模板编号">{viewingEntry.code}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={viewingEntry.status === 'active' ? 'green' : 'default'}>
                  {viewingEntry.status === 'active' ? '启用' : '停用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="事项分类">{viewingEntry.categoryName}</Descriptions.Item>
              <Descriptions.Item label="责任单位">{viewingEntry.departmentName}</Descriptions.Item>
              <Descriptions.Item label="创建人">{viewingEntry.creator}</Descriptions.Item>
              <Descriptions.Item label="使用次数">{viewingEntry.usageCount}</Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>
                {viewingEntry.updatedAt}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <div className="text-sm text-gray-500 mb-2">关键词</div>
              <Space size={[0, 6]} wrap>
                {viewingEntry.keywords.map((keyword) => (
                  <Tag key={keyword}>{keyword}</Tag>
                ))}
              </Space>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-2">办理结果模板</div>
              <div className="whitespace-pre-wrap leading-7 bg-gray-50 border border-gray-100 rounded-lg p-4">
                {viewingEntry.content}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
