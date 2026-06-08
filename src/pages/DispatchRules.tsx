import { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { DispatchRule } from '@/types';
import { areas, categories, departments } from '@/data/dictionaries';

type DispatchRuleForm = Omit<DispatchRule, 'id' | 'createdAt' | 'updatedAt'>;

const DispatchRules: React.FC = () => {
  const {
    dispatchRules,
    addDispatchRule,
    updateDispatchRule,
    deleteDispatchRule,
    toggleDispatchRuleStatus,
  } = useAppStore();
  const [form] = Form.useForm<DispatchRuleForm>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DispatchRule | null>(null);

  const categoryNameMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    []
  );
  const areaNameMap = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), []);
  const departmentNameMap = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    []
  );
  const parentCategories = categories.filter((category) => !category.parentId);

  const openCreateModal = () => {
    setEditingRule(null);
    form.setFieldsValue({
      name: '',
      categoryId: undefined,
      areaId: undefined,
      departmentId: undefined,
      priority: 50,
      enabled: true,
      remark: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (rule: DispatchRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setModalOpen(true);
  };

  const handleSubmit = (values: DispatchRuleForm) => {
    const payload = {
      ...values,
      areaId: values.areaId || undefined,
      priority: values.priority ?? 50,
      enabled: values.enabled ?? true,
    };

    if (editingRule) {
      updateDispatchRule(editingRule.id, payload);
      message.success('派单规则已更新');
    } else {
      addDispatchRule(payload);
      message.success('派单规则已新增');
    }
    setModalOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<DispatchRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      width: 180,
      fixed: 'left',
      render: (name, record) => (
        <div>
          <div className="font-medium text-gray-800">{name}</div>
          <div className="text-xs text-gray-400">优先级 {record.priority}</div>
        </div>
      ),
    },
    {
      title: '事项分类',
      dataIndex: 'categoryId',
      width: 160,
      render: (categoryId) => categoryNameMap.get(categoryId) || categoryId,
    },
    {
      title: '所属区域',
      dataIndex: 'areaId',
      width: 130,
      render: (areaId) => areaId ? areaNameMap.get(areaId) || areaId : <Tag>全部区域</Tag>,
    },
    {
      title: '责任单位',
      dataIndex: 'departmentId',
      width: 180,
      render: (departmentId) => departmentNameMap.get(departmentId) || departmentId,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={(checked) => toggleDispatchRuleStatus(record.id, checked)}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 170,
      render: (updatedAt) => dayjs(updatedAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (remark) => remark || <span className="text-gray-400">无</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<Edit3 size={14} />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="删除派单规则"
            description="删除后新增投诉将不再使用该规则匹配。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => {
              deleteDispatchRule(record.id);
              message.success('派单规则已删除');
            }}
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
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <div className="font-medium text-gray-800">派单规则列表</div>
            <div className="text-sm text-gray-400">按分类、区域和优先级匹配责任单位</div>
          </div>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            新增规则
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={[...dispatchRules].sort((a, b) => b.priority - a.priority)}
          scroll={{ x: 1180 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条规则`,
          }}
        />
      </div>

      <Modal
        title={editingRule ? '编辑派单规则' : '新增派单规则'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="事项分类"
              name="categoryId"
              rules={[{ required: true, message: '请选择事项分类' }]}
            >
              <Select placeholder="请选择事项分类">
                {parentCategories.map((category) => (
                  <Select.OptGroup key={category.id} label={category.name}>
                    <Select.Option value={category.id}>{category.name}全部子类</Select.Option>
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
            <Form.Item label="所属区域" name="areaId">
              <Select placeholder="全部区域" allowClear>
                {areas.map((area) => (
                  <Select.Option key={area.id} value={area.id}>
                    {area.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="责任单位"
              name="departmentId"
              rules={[{ required: true, message: '请选择责任单位' }]}
            >
              <Select placeholder="请选择责任单位">
                {departments.map((department) => (
                  <Select.Option key={department.id} value={department.id}>
                    {department.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="优先级"
              name="priority"
              rules={[{ required: true, message: '请输入优先级' }]}
            >
              <InputNumber min={1} max={999} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入规则说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DispatchRules;
