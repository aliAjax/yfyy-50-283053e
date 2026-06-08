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
  Switch,
  Tag,
  Popconfirm,
  InputNumber,
} from 'antd';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Settings,
  Zap,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { DispatchRule } from '@/types';
import { categories, areas, departments } from '@/data/dictionaries';

const DispatchRules: React.FC = () => {
  const { dispatchRules, addDispatchRule, updateDispatchRule, deleteDispatchRule, toggleDispatchRuleStatus } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<DispatchRule | null>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    keyword: '',
    categoryId: undefined as string | undefined,
    areaId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
    enabled: undefined as boolean | undefined,
  });

  const filteredRules = dispatchRules.filter((r) => {
    if (filters.keyword && !r.name.includes(filters.keyword) && !r.id.includes(filters.keyword)) {
      return false;
    }
    if (filters.categoryId && !r.categoryId.startsWith(filters.categoryId)) return false;
    if (filters.areaId && r.areaId !== filters.areaId) return false;
    if (filters.departmentId && r.departmentId !== filters.departmentId) return false;
    if (filters.enabled !== undefined && r.enabled !== filters.enabled) return false;
    return true;
  });

  const parentCategories = categories.filter((c) => !c.parentId);

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      priority: 50,
      enabled: true,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (rule: DispatchRule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      name: rule.name,
      categoryId: rule.categoryId,
      areaId: rule.areaId,
      departmentId: rule.departmentId,
      priority: rule.priority,
      enabled: rule.enabled,
      description: rule.description,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = (values: {
    name: string;
    categoryId: string;
    areaId: string;
    departmentId: string;
    priority: number;
    enabled: boolean;
    description?: string;
  }) => {
    const category = categories.find((c) => c.id === values.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === values.areaId);
    const department = departments.find((d) => d.id === values.departmentId);

    const categoryName = parentCategory
      ? `${parentCategory.name} - ${category?.name}`
      : category?.name || '';

    if (editingRule) {
      updateDispatchRule(editingRule.id, {
        ...values,
        categoryName,
        areaName: area?.name || '',
        departmentName: department?.name || '',
      });
      message.success('规则更新成功');
    } else {
      addDispatchRule({
        ...values,
        categoryName,
        areaName: area?.name || '',
        departmentName: department?.name || '',
      });
      message.success('规则创建成功');
    }

    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = (id: string) => {
    deleteDispatchRule(id);
    message.success('规则已删除');
  };

  const handleToggle = (id: string) => {
    toggleDispatchRuleStatus(id);
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      categoryId: undefined,
      areaId: undefined,
      departmentId: undefined,
      enabled: undefined,
    });
  };

  const columns: ColumnsType<DispatchRule> = [
    {
      title: '规则编号',
      dataIndex: 'id',
      width: 100,
      render: (id) => <span className="text-blue-600 font-mono text-sm">{id}</span>,
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 200,
      render: (name, record) => (
        <div>
          <span className="text-gray-800">{name}</span>
          {!record.enabled && (
            <Tag color="default" className="ml-2 text-xs">
              已停用
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '事项分类',
      dataIndex: 'categoryName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '所属区域',
      dataIndex: 'areaName',
      width: 100,
    },
    {
      title: '责任单位',
      dataIndex: 'departmentName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={priority >= 90 ? 'red' : priority >= 70 ? 'orange' : 'blue'}>
          {priority}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (enabled) => (
        <Tag color={enabled ? 'green' : 'default'}>
          {enabled ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
      render: (time) => <span className="text-gray-500 text-sm">{time}</span>,
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
            icon={<Edit2 size={14} />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Switch
            size="small"
            checked={record.enabled}
            onChange={() => handleToggle(record.id)}
          />
          <Popconfirm
            title="确定删除此规则？"
            description="删除后将无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<Trash2 size={14} />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col span={6}>
            <Input
              placeholder="搜索规则编号或名称"
              prefix={<Search size={16} className="text-gray-400" />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              allowClear
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
            <Select
              placeholder="责任单位"
              allowClear
              style={{ width: '100%' }}
              value={filters.departmentId}
              onChange={(val) => setFilters({ ...filters, departmentId: val })}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.enabled}
              onChange={(val) => setFilters({ ...filters, enabled: val })}
              options={[
                { label: '启用', value: true },
                { label: '停用', value: false },
              ]}
            />
          </Col>
          <Col span={3}>
            <Space>
              <Button onClick={resetFilters}>重置</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-500" />
            <span className="font-medium text-gray-800">派单规则列表</span>
            <span className="text-sm text-gray-400">共 {filteredRules.length} 条</span>
          </div>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={handleAdd}
          >
            新增规则
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredRules}
          scroll={{ x: 1200, y: 550 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </div>

      <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <Zap size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-800 mb-1">派单规则说明</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 系统根据<strong>分类 + 区域</strong>匹配派单规则，自动确定责任单位</li>
              <li>• 优先匹配<strong>精确匹配</strong>（分类和区域都相同），其次按分类或区域模糊匹配</li>
              <li>• 多条规则匹配时，按<strong>优先级</strong>从高到低选择，数字越大优先级越高</li>
              <li>• 匹配不到规则时，系统会提示<strong>人工选择</strong>责任单位</li>
            </ul>
          </div>
        </div>
      </div>

      <Modal
        title={editingRule ? '编辑派单规则' : '新增派单规则'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRule(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称，如：东城区市容环境派单规则" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="事项分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择事项分类' }]}
              >
                <Select placeholder="请选择分类">
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
            <Col span={12}>
              <Form.Item
                label="所属区域"
                name="areaId"
                rules={[{ required: true, message: '请选择所属区域' }]}
              >
                <Select placeholder="请选择区域">
                  {areas.map((a) => (
                    <Select.Option key={a.id} value={a.id}>
                      {a.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="责任单位"
            name="departmentId"
            rules={[{ required: true, message: '请选择责任单位' }]}
          >
            <Select placeholder="请选择责任单位" showSearch optionFilterProp="children">
              {departments.map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                rules={[{ required: true, message: '请设置优先级' }]}
              >
                <InputNumber
                  min={1}
                  max={100}
                  style={{ width: '100%' }}
                  placeholder="数字越大优先级越高"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="启用状态"
                name="enabled"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="规则说明" name="description">
            <Input.TextArea rows={3} placeholder="请输入规则说明（可选）" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRule ? '保存修改' : '创建规则'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingRule(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DispatchRules;
