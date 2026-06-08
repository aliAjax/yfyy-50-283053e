import { useState } from 'react';
import {
  Input,
  Select,
  Row,
  Col,
  Card,
  Tag,
  Empty,
  Modal,
  Descriptions,
  Button,
  Space,
  Divider,
} from 'antd';
import {
  Search,
  User,
  Phone,
  Building2,
  MapPin,
  ClipboardList,
  Eye,
  X,
} from 'lucide-react';
import { departments, departmentTypes } from '@/data/dictionaries';
import type { Department } from '@/types';

const { Search: SearchInput } = Input;

const DepartmentDirectory: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const filteredDepartments = departments.filter((dept) => {
    if (typeFilter !== '全部' && dept.type !== typeFilter) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      const matchName = dept.name.toLowerCase().includes(kw);
      const matchContact = dept.contact?.toLowerCase().includes(kw);
      const matchPhone = dept.phone?.includes(kw);
      const matchResponsibilities = dept.responsibilities?.toLowerCase().includes(kw);
      const matchAddress = dept.address?.toLowerCase().includes(kw);
      if (!matchName && !matchContact && !matchPhone && !matchResponsibilities && !matchAddress) return false;
    }
    return true;
  });

  const getTypeTagColor = (type: string) => {
    switch (type) {
      case '综合部门':
        return 'blue';
      case '专业部门':
        return 'green';
      case '执法部门':
        return 'red';
      default:
        return 'default';
    }
  };

  const handleViewDetail = (dept: Department) => {
    setSelectedDept(dept);
    setDetailVisible(true);
  };

  const DepartmentCard: React.FC<{ dept: Department }> = ({ dept }) => (
    <Card
      className="h-full hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => handleViewDetail(dept)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Building2 size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              {dept.name}
            </h3>
            <Tag color={getTypeTagColor(dept.type)} className="m-0 mt-1">
              {dept.type}
            </Tag>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<Eye size={14} />}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetail(dept);
          }}
        >
          查看
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        {dept.contact && (
          <div className="flex items-center gap-2 text-gray-600">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">联系人：{dept.contact}</span>
          </div>
        )}
        {dept.phone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={14} className="text-gray-400 flex-shrink-0" />
            <span className="font-mono">电话：{dept.phone}</span>
          </div>
        )}
        {dept.address && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span className="line-clamp-1">地址：{dept.address}</span>
          </div>
        )}
      </div>

      {dept.responsibilities && (
        <>
          <div className="my-3 border-t border-gray-100" />
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <ClipboardList size={12} />
              <span>负责事项</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              {dept.responsibilities}
            </p>
          </div>
        </>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">责任单位通讯录</h2>
          <p className="text-sm text-gray-500 mt-1">
            展示各责任单位的基本信息和联系方式，方便工作沟通对接
          </p>
        </div>
        <div className="text-sm text-gray-500">
          共 <span className="font-semibold text-blue-600">{filteredDepartments.length}</span> 个单位
        </div>
      </div>

      <Card size="small" className="shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="搜索单位名称、联系人、电话、负责事项、地址"
            allowClear
            style={{ width: 360 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            prefix={<Search size={16} className="text-gray-400" />}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">单位类型：</span>
            <Select
              style={{ width: 140 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={departmentTypes.map((type) => ({
                label: type,
                value: type,
              }))}
            />
          </div>
        </div>
      </Card>

      {filteredDepartments.length === 0 ? (
        <div className="py-20">
          <Empty description="暂无匹配的责任单位" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredDepartments.map((dept) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={dept.id}>
              <DepartmentCard dept={dept} />
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-blue-500" />
            <span>单位详情</span>
          </div>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
        closeIcon={<X size={18} />}
      >
        {selectedDept && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  {selectedDept.name}
                </h3>
                <Tag color={getTypeTagColor(selectedDept.type)} className="m-0 mt-2">
                  {selectedDept.type}
                </Tag>
              </div>
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 size={28} className="text-blue-500" />
              </div>
            </div>

            <Divider className="my-0" />

            <Descriptions column={2} size="small">
              {selectedDept.contact && (
                <Descriptions.Item label="联系人">
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-gray-400" />
                    <span>{selectedDept.contact}</span>
                  </div>
                </Descriptions.Item>
              )}
              {selectedDept.phone && (
                <Descriptions.Item label="联系电话">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    <span className="font-mono">{selectedDept.phone}</span>
                  </div>
                </Descriptions.Item>
              )}
              {selectedDept.address && (
                <Descriptions.Item label="单位地址" span={2}>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-400" />
                    <span>{selectedDept.address}</span>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedDept.responsibilities && (
              <>
                <Divider className="my-0" />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <ClipboardList size={15} className="text-blue-500" />
                    <span>主要职责</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-600 leading-relaxed text-sm">
                    {selectedDept.responsibilities}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Space>
                <Button onClick={() => setDetailVisible(false)}>关闭</Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepartmentDirectory;
