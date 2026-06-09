import { useState, useMemo } from 'react';
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
  Divider,
  Empty,
} from 'antd';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Settings,
  Zap,
  Eye,
  Trophy,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { DispatchRule } from '@/types';
import { categories, areas, departments } from '@/data/dictionaries';
import { getAllMatchingRules, type RuleHitPreview } from '@/lib/utils';

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

  const previewCategoryId = Form.useWatch('categoryId', form);
  const previewAreaId = Form.useWatch('areaId', form);
  const previewPriority = Form.useWatch('priority', form);
  const previewName = Form.useWatch('name', form);
  const previewDepartmentId = Form.useWatch('departmentId', form);
  const previewEnabled = Form.useWatch('enabled', form);

  const { previewHits, currentRuleRank } = useMemo(() => {
    if (!previewCategoryId || !previewAreaId) {
      return { previewHits: [] as RuleHitPreview[], currentRuleRank: null as null | { rank: number; level: string; levelColor: string } };
    }

    const department = departments.find((d) => d.id === previewDepartmentId);
    const category = categories.find((c) => c.id === previewCategoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const categoryName = parentCategory
      ? `${parentCategory.name} - ${category?.name}`
      : category?.name || '';
    const area = areas.find((a) => a.id === previewAreaId);

    const canBuildCurrentRule =
      previewPriority !== undefined && previewDepartmentId && department;

    const currentRuleData = canBuildCurrentRule
      ? {
          id: editingRule?.id || '__NEW_RULE__',
          categoryId: previewCategoryId,
          areaId: previewAreaId,
          departmentId: previewDepartmentId,
          departmentName: department.name,
          priority: previewPriority as number,
          name: previewName || '(未命名规则)',
          enabled: previewEnabled !== false,
          categoryName,
          areaName: area?.name || '',
        }
      : undefined;

    const hits = getAllMatchingRules(previewCategoryId, previewAreaId, dispatchRules, {
      excludeRuleId: editingRule?.id,
      currentRule: currentRuleData,
    });

    let currentRank: null | { rank: number; level: string; levelColor: string } = null;
    const currentIndex = hits.findIndex((h) => h.isCurrent);
    if (currentIndex >= 0) {
      const hit = hits[currentIndex];
      const colorMap: Record<string, string> = {
        exact: 'red',
        category_match: 'orange',
        area_match: 'blue',
      };
      currentRank = {
        rank: currentIndex + 1,
        level: hit.matchLevelText,
        levelColor: currentIndex === 0 ? 'green' : colorMap[hit.matchLevel] || 'default',
      };
    }

    return { previewHits: hits, currentRuleRank: currentRank };
  }, [
    previewCategoryId,
    previewAreaId,
    previewPriority,
    previewName,
    previewDepartmentId,
    previewEnabled,
    dispatchRules,
    editingRule,
  ]);

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
        width={760}
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

          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-blue-500" />
                <span className="font-medium text-gray-800">规则命中预览</span>
                <span className="text-xs text-gray-400">
                  根据当前选择的分类和区域，实时查看命中的规则
                </span>
              </div>
              {currentRuleRank && (
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 shadow-sm">
                  <Trophy
                    size={14}
                    className={
                      currentRuleRank.rank === 1
                        ? 'text-yellow-500'
                        : 'text-gray-400'
                    }
                  />
                  <span className="text-xs text-gray-600">
                    当前规则排名：
                  </span>
                  <Tag
                    color={currentRuleRank.levelColor}
                    style={{ margin: 0 }}
                  >
                    第 {currentRuleRank.rank} 位 · {currentRuleRank.level}
                  </Tag>
                </div>
              )}
            </div>

            {!previewCategoryId || !previewAreaId ? (
              <div className="py-6">
                <Empty
                  description="请先选择事项分类和所属区域"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : previewHits.length === 0 ? (
              <div className="py-6">
                <Empty
                  description={
                    <div>
                      <div className="text-gray-600 mb-1">
                        暂无命中的规则
                      </div>
                      <div className="text-xs text-gray-400">
                        当前分类和区域组合下，还没有启用的规则
                        {previewPriority === undefined || !previewDepartmentId
                          ? '，请继续设置优先级和责任单位以预览当前规则'
                          : ''}
                      </div>
                    </div>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-xs font-medium text-gray-500">
                  <div className="col-span-1">排序</div>
                  <div className="col-span-2">命中层级</div>
                  <div className="col-span-3">规则名称</div>
                  <div className="col-span-3">责任单位</div>
                  <div className="col-span-2">优先级</div>
                  <div className="col-span-1 text-right">状态</div>
                </div>
                {previewHits.map((hit: RuleHitPreview, index: number) => (
                  <div
                    key={hit.rule.id}
                    className={`grid grid-cols-12 gap-2 items-center rounded-md px-2 py-2.5 text-sm transition-colors ${
                      hit.isCurrent
                        ? 'bg-green-50 border-2 border-green-300 shadow-sm'
                        : index === 0
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-white hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div className="col-span-1">
                      {index === 0 ? (
                        <Tag color="gold" style={{ margin: 0 }}>
                          #1
                        </Tag>
                      ) : (
                        <span className="text-gray-400 font-mono">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-1">
                      <Tag
                        color={
                          hit.matchLevel === 'exact'
                            ? 'red'
                            : hit.matchLevel === 'category_match'
                            ? 'orange'
                            : 'blue'
                        }
                        style={{ margin: 0 }}
                      >
                        {hit.matchLevelText}
                      </Tag>
                      {hit.isCurrent && (
                        <Tag color="green" style={{ margin: 0 }}>
                          当前规则
                        </Tag>
                      )}
                    </div>
                    <div className="col-span-3">
                      <div
                        className={`truncate ${hit.isCurrent ? 'font-semibold text-green-800' : 'text-gray-800'}`}
                        title={hit.rule.name}
                      >
                        {hit.rule.name}
                      </div>
                      <div
                        className="text-xs text-gray-400 font-mono truncate"
                        title={hit.rule.id}
                      >
                        {hit.rule.id.startsWith('__') ? '(新规则)' : hit.rule.id}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <span
                        className={`truncate ${hit.isCurrent ? 'text-green-700' : 'text-gray-700'}`}
                        title={hit.rule.departmentName}
                      >
                        {hit.rule.departmentName}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <Tag
                        color={
                          hit.rule.priority >= 90
                            ? 'red'
                            : hit.rule.priority >= 70
                            ? 'orange'
                            : 'blue'
                        }
                        style={{ margin: 0 }}
                      >
                        {hit.rule.priority}
                      </Tag>
                    </div>
                    <div className="col-span-1 text-right">
                      <Tag
                        color={hit.rule.enabled ? 'green' : 'default'}
                        style={{ margin: 0 }}
                      >
                        {hit.rule.enabled ? '启用' : '停用'}
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!currentRuleRank && previewCategoryId && previewAreaId && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-700 border border-amber-200">
                <Zap size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  {previewEnabled === false ? (
                    <>当前规则已停用，不会参与派单命中排序。</>
                  ) : (
                    <>
                      请设置<strong>优先级</strong>和<strong>责任单位</strong>
                      ，即可查看当前规则在命中列表中的排名。
                    </>
                  )}
                </div>
              </div>
            )}

            {previewHits.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-blue-50/50 p-2.5 text-xs text-gray-600">
                <Zap size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-gray-700">匹配说明：</strong>
                  系统优先匹配
                  <Tag color="red" style={{ margin: '0 2px' }}>
                    精确匹配
                  </Tag>
                  层级，其次是
                  <Tag color="orange" style={{ margin: '0 2px' }}>
                    分类匹配
                  </Tag>
                  ，最后是
                  <Tag color="blue" style={{ margin: '0 2px' }}>
                    区域匹配
                  </Tag>
                  ；同一层级内按优先级从高到低排序，排名 #1 的规则将生效。
                  <Tag color="green" style={{ margin: '0 2px' }}>
                    当前规则
                  </Tag>
                  为您正在编辑的规则。
                </div>
              </div>
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />

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
