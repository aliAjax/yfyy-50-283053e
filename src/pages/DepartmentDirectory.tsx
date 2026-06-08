import { useMemo, useState } from 'react';
import { Button, Col, Descriptions, Input, Modal, Row, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Building2, Eye, Phone, Search, UserRound } from 'lucide-react';
import { departments } from '@/data/dictionaries';
import type { Department } from '@/types';

const DepartmentDirectory: React.FC = () => {
  const [filters, setFilters] = useState({
    keyword: '',
    type: undefined as string | undefined,
  });
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);

  const typeOptions = useMemo(
    () =>
      Array.from(new Set(departments.map((department) => department.type))).map((type) => ({
        label: type,
        value: type,
      })),
    []
  );

  const filteredDepartments = departments.filter((department) => {
    const keyword = filters.keyword.trim();
    if (keyword && !department.name.includes(keyword)) return false;
    if (filters.type && department.type !== filters.type) return false;
    return true;
  });

  const columns: ColumnsType<Department> = [
    {
      title: '责任单位',
      dataIndex: 'name',
      width: 220,
      fixed: 'left',
      render: (name, record) => (
        <button
          type="button"
          className="text-left text-blue-600 hover:text-blue-700"
          onClick={() => setViewingDepartment(record)}
        >
          <div className="font-medium">{name}</div>
          <div className="mt-1">
            <Tag color="blue">{record.type}</Tag>
          </div>
        </button>
      ),
    },
    {
      title: '单位类型',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => <Tag color="geekblue">{type}</Tag>,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      width: 120,
      render: (contactName: string) => (
        <Space size={6}>
          <UserRound size={14} className="text-gray-400" />
          <span>{contactName}</span>
        </Space>
      ),
    },
    {
      title: '电话',
      dataIndex: 'contactPhone',
      width: 150,
      render: (contactPhone: string) => (
        <Space size={6}>
          <Phone size={14} className="text-gray-400" />
          <span className="font-mono text-sm">{contactPhone}</span>
        </Space>
      ),
    },
    {
      title: '负责事项',
      dataIndex: 'responsibilities',
      render: (responsibilities: string[]) => (
        <Space size={[0, 6]} wrap>
          {responsibilities.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => setViewingDepartment(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="按单位名称搜索"
              prefix={<Search size={16} className="text-gray-400" />}
              value={filters.keyword}
              onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="单位类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              options={typeOptions}
            />
          </Col>
        </Row>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredDepartments}
        scroll={{ x: 980 }}
        pagination={{
          pageSize: 8,
          showTotal: (total) => `共 ${total} 个责任单位`,
        }}
      />

      <Modal
        title={
          <Space size={8}>
            <Building2 size={18} className="text-blue-500" />
            <span>单位基础信息</span>
          </Space>
        }
        open={!!viewingDepartment}
        onCancel={() => setViewingDepartment(null)}
        footer={<Button onClick={() => setViewingDepartment(null)}>关闭</Button>}
        width={720}
      >
        {viewingDepartment && (
          <div className="space-y-4">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="责任单位" span={2}>
                {viewingDepartment.name}
              </Descriptions.Item>
              <Descriptions.Item label="单位类型">
                <Tag color="geekblue">{viewingDepartment.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="联系人">{viewingDepartment.contactName}</Descriptions.Item>
              <Descriptions.Item label="电话" span={2}>
                <span className="font-mono">{viewingDepartment.contactPhone}</span>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <div className="text-sm text-gray-500 mb-2">负责事项</div>
              <Space size={[0, 6]} wrap>
                {viewingDepartment.responsibilities.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepartmentDirectory;
