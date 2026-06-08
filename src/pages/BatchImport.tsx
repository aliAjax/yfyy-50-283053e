import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Progress,
  Space,
  Statistic,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  ListChecks,
  UploadCloud,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, type BackendComplaintForm } from '@/store/appStore';
import { areas, categories, departments } from '@/data/dictionaries';

type PreviewStatus = 'ready' | 'warning' | 'error' | 'imported';

interface ParsedImportRow extends BackendComplaintForm {
  key: string;
  rowNo: number;
  categoryText: string;
  areaText: string;
  departmentText: string;
  status: PreviewStatus;
  missingFields: string[];
  errors: string[];
  warnings: string[];
  importedComplaintId?: string;
}

interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  total: number;
  success: number;
  failed: number;
}

const sampleRows = [
  {
    title: '小区门口占道经营影响通行',
    content: '东城区和平里街道小区门口长期有流动摊贩占道经营，早晚高峰影响居民通行。',
    categoryText: '城市管理 - 占道经营',
    areaText: '东城区',
    departmentText: '城市管理委员会',
    contactName: '张女士',
    contactPhone: '13800138001',
    address: '东城区和平里北街18号',
  },
  {
    title: '公交站台夜间照明损坏',
    content: '海淀区某公交站台灯箱和照明设施损坏，夜间候车存在安全隐患。',
    categoryText: '市政设施 - 道路养护',
    areaText: '海淀区',
    departmentText: '住房和城乡建设局',
    contactName: '李先生',
    contactPhone: '',
    address: '海淀区中关村南路公交站',
  },
  {
    title: '餐饮油烟扰民',
    content: '楼下餐饮店油烟直排，晚间噪声较大。',
    categoryText: '环境保护 - 油烟污染',
    areaText: '未知区域',
    departmentText: '生态环境局',
    contactName: '王先生',
    contactPhone: '13900139002',
    address: '朝阳区望京街道',
  },
];

const findCategoryByText = (text: string) => {
  const normalized = text.replace(/\s/g, '');
  return categories.find((category) => {
    if (!category.parentId) return false;
    const parent = categories.find((item) => item.id === category.parentId);
    return (
      normalized === category.name ||
      normalized === `${parent?.name || ''}-${category.name}` ||
      normalized === `${parent?.name || ''}/${category.name}` ||
      normalized === `${parent?.name || ''}${category.name}`
    );
  });
};

const buildCategoryName = (categoryId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  const parent = categories.find((item) => item.id === category?.parentId);
  return parent ? `${parent.name} - ${category?.name || ''}` : category?.name || '';
};

const validatePhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone);

const buildPreviewRows = (): ParsedImportRow[] =>
  sampleRows.map((row, index) => {
    const category = findCategoryByText(row.categoryText);
    const area = areas.find((item) => item.name === row.areaText);
    const department = departments.find((item) => item.name === row.departmentText);
    const missingFields: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.title) missingFields.push('投诉标题');
    if (!row.content) missingFields.push('投诉内容');
    if (!row.contactName) missingFields.push('联系人');
    if (!row.contactPhone) missingFields.push('联系电话');
    if (!category) errors.push(`未识别分类：${row.categoryText}`);
    if (!area) errors.push(`未识别区域：${row.areaText}`);
    if (!department) errors.push(`未识别责任单位：${row.departmentText}`);
    if (row.contactPhone && !validatePhone(row.contactPhone)) errors.push('联系电话格式错误');
    if (row.title.length > 100) warnings.push('投诉标题超过100字，导入前建议精简');
    if (row.content.length > 1000) warnings.push('投诉内容超过1000字，导入前建议拆分');
    if (missingFields.length) errors.push(`缺失字段：${missingFields.join('、')}`);

    return {
      key: `row-${index + 1}`,
      rowNo: index + 1,
      title: row.title,
      content: row.content,
      categoryText: row.categoryText,
      areaText: row.areaText,
      departmentText: row.departmentText,
      categoryId: category?.id || '',
      areaId: area?.id || '',
      departmentId: department?.id || '',
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      address: row.address,
      status: errors.length ? 'error' : warnings.length ? 'warning' : 'ready',
      missingFields,
      errors,
      warnings,
    };
  });

const BatchImport: React.FC = () => {
  const navigate = useNavigate();
  const { submitBackendComplaint } = useAppStore();
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [batchHistory, setBatchHistory] = useState<ImportBatch[]>([]);
  const [selectedRow, setSelectedRow] = useState<ParsedImportRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);

  const summary = useMemo(() => {
    const validRows = rows.filter((row) => row.status === 'ready' || row.status === 'warning');
    return {
      total: rows.length,
      valid: validRows.length,
      error: rows.filter((row) => row.status === 'error').length,
      warning: rows.filter((row) => row.status === 'warning').length,
      imported: rows.filter((row) => row.status === 'imported').length,
    };
  }, [rows]);

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      const parsedRows = buildPreviewRows();
      setRows(parsedRows);
      setLastImportedIds([]);
      message.success(`${file.name}解析完成，已生成${parsedRows.length}条模拟预览数据`);
      return false;
    },
  };

  const handleDownloadTemplate = () => {
    const headers = '投诉标题,投诉内容,事项分类,所属区域,责任单位,联系人,联系电话,详细地址';
    const content = `${headers}\n小区门口占道经营影响通行,请描述投诉内容,城市管理 - 占道经营,东城区,城市管理委员会,张女士,13800138001,东城区和平里北街18号`;
    const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '投诉批量录入模板.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = () => {
    const importableRows = rows.filter((row) => row.status === 'ready' || row.status === 'warning');
    if (!importableRows.length) {
      message.warning('没有可导入的数据，请先处理错误行');
      return;
    }
    setConfirmOpen(true);
  };

  const handleImport = () => {
    const importableRows = rows.filter((row) => row.status === 'ready' || row.status === 'warning');
    setImporting(true);
    setProgress(0);

    const importedIds: string[] = [];
    const updatedRows = rows.map((row, index) => {
      if (row.status !== 'ready' && row.status !== 'warning') return row;
      const complaint = submitBackendComplaint({
        title: row.title,
        content: row.content,
        categoryId: row.categoryId,
        areaId: row.areaId,
        departmentId: row.departmentId,
        contactName: row.contactName,
        contactPhone: row.contactPhone,
        address: row.address,
      });
      importedIds.push(complaint.id);
      setProgress(Math.round(((index + 1) / rows.length) * 100));
      return { ...row, status: 'imported' as const, importedComplaintId: complaint.id };
    });

    setRows(updatedRows);
    setLastImportedIds(importedIds);
    setBatchHistory((history) => [
      {
        id: `B${Date.now()}`,
        fileName: '模拟批量导入文件.csv',
        importedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        total: rows.length,
        success: importableRows.length,
        failed: rows.length - importableRows.length,
      },
      ...history,
    ]);
    setProgress(100);
    setImporting(false);
    setConfirmOpen(false);
    message.success(`已导入${importableRows.length}条投诉，系统已自动派单`);
  };

  const columns: ColumnsType<ParsedImportRow> = [
    {
      title: '行号',
      dataIndex: 'rowNo',
      width: 70,
      fixed: 'left',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: PreviewStatus) => {
        const meta: Record<PreviewStatus, { color: string; text: string }> = {
          ready: { color: 'green', text: '可导入' },
          warning: { color: 'orange', text: '需关注' },
          error: { color: 'red', text: '错误' },
          imported: { color: 'blue', text: '已导入' },
        };
        return <Tag color={meta[status].color}>{meta[status].text}</Tag>;
      },
    },
    {
      title: '投诉编号',
      dataIndex: 'importedComplaintId',
      width: 130,
      render: (id?: string) =>
        id ? (
          <Button type="link" size="small" onClick={() => navigate(`/complaints/${id}`)}>
            {id}
          </Button>
        ) : (
          <span className="text-gray-400">待生成</span>
        ),
    },
    {
      title: '投诉标题',
      dataIndex: 'title',
      width: 240,
      ellipsis: true,
    },
    {
      title: '识别分类',
      width: 180,
      render: (_, record) => buildCategoryName(record.categoryId) || record.categoryText,
    },
    {
      title: '识别区域',
      width: 110,
      render: (_, record) => areas.find((area) => area.id === record.areaId)?.name || record.areaText,
    },
    {
      title: '责任单位',
      width: 170,
      render: (_, record) =>
        departments.find((department) => department.id === record.departmentId)?.name ||
        record.departmentText,
    },
    {
      title: '缺失字段',
      dataIndex: 'missingFields',
      width: 160,
      render: (fields: string[]) =>
        fields.length ? fields.map((field) => <Tag key={field} color="red">{field}</Tag>) : '-',
    },
    {
      title: '错误摘要',
      width: 260,
      render: (_, record) => {
        const items = [...record.errors, ...record.warnings];
        return items.length ? (
          <span className={record.errors.length ? 'text-red-600' : 'text-orange-600'}>
            {items.join('；')}
          </span>
        ) : (
          <span className="text-green-600">校验通过</span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<Eye size={14} />} onClick={() => setSelectedRow(record)}>
          详情
        </Button>
      ),
    },
  ];

  const historyColumns: ColumnsType<ImportBatch> = [
    { title: '批次号', dataIndex: 'id', width: 150 },
    { title: '文件名', dataIndex: 'fileName' },
    { title: '导入时间', dataIndex: 'importedAt', width: 180 },
    { title: '总行数', dataIndex: 'total', width: 90 },
    { title: '成功', dataIndex: 'success', width: 90 },
    { title: '失败', dataIndex: 'failed', width: 90 },
    {
      title: '状态',
      width: 120,
      render: (_, record) => (
        <Tag color={record.failed ? 'orange' : 'green'}>
          {record.failed ? '部分成功' : '全部成功'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">批量录入预览</h2>
            <p className="text-sm text-gray-500 mt-1">
              上传表格后先预览识别结果，确认无误再批量写入投诉列表
            </p>
          </div>
          <Space wrap>
            <Button icon={<Download size={16} />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button
              type="primary"
              icon={<CheckCircle2 size={16} />}
              disabled={!summary.valid || importing}
              onClick={handleConfirmImport}
            >
              确认导入
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadCloud size={42} className="mx-auto text-blue-500" />
          </p>
          <p className="ant-upload-text">点击或拖拽Excel、CSV文件到此处上传</p>
          <p className="ant-upload-hint">当前为前端模拟解析，上传任意支持格式文件即可生成预览数据</p>
        </Upload.Dragger>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-sm"><Statistic title="待导入行" value={summary.total} /></Card>
        <Card className="shadow-sm"><Statistic title="可导入" value={summary.valid} valueStyle={{ color: '#16a34a' }} /></Card>
        <Card className="shadow-sm"><Statistic title="缺失/错误" value={summary.error} valueStyle={{ color: '#dc2626' }} /></Card>
        <Card className="shadow-sm"><Statistic title="需关注" value={summary.warning} valueStyle={{ color: '#d97706' }} /></Card>
        <Card className="shadow-sm"><Statistic title="已导入" value={summary.imported} valueStyle={{ color: '#2563eb' }} /></Card>
      </div>

      {lastImportedIds.length > 0 && (
        <Alert
          type="success"
          showIcon
          message={`本次已成功导入${lastImportedIds.length}条投诉`}
          description={
            <Space wrap className="mt-2">
              <Button size="small" type="primary" onClick={() => navigate('/complaints')}>
                前往投诉列表
              </Button>
              {lastImportedIds.slice(0, 3).map((id) => (
                <Button key={id} size="small" onClick={() => navigate(`/complaints/${id}`)}>
                  查看{id}
                </Button>
              ))}
            </Space>
          }
        />
      )}

      {importing && <Progress percent={progress} status="active" />}

      <Card
        className="shadow-sm"
        title={
          <Space>
            <ListChecks size={18} />
            <span>待导入数据预览</span>
          </Space>
        }
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1450 }}
          pagination={{ pageSize: 8 }}
          rowClassName={(record) =>
            record.status === 'error'
              ? 'bg-red-50'
              : record.status === 'warning'
                ? 'bg-orange-50'
                : record.status === 'imported'
                  ? 'bg-green-50'
                  : ''
          }
          locale={{
            emptyText: (
              <div className="py-8 text-gray-500">
                <FileSpreadsheet size={36} className="mx-auto mb-2" />
                上传文件后查看模拟解析结果
              </div>
            ),
          }}
        />
      </Card>

      <Card className="shadow-sm" title="导入历史">
        <Table
          rowKey="id"
          columns={historyColumns}
          dataSource={batchHistory}
          pagination={false}
          locale={{ emptyText: '暂无导入历史' }}
        />
      </Card>

      <Modal
        title="确认批量导入"
        open={confirmOpen}
        confirmLoading={importing}
        onOk={handleImport}
        onCancel={() => setConfirmOpen(false)}
        okText="确认写入投诉列表"
        cancelText="取消"
      >
        <Alert
          type="info"
          showIcon
          message={`将导入${summary.valid}条有效数据`}
          description="导入后将按后台录入来源写入投诉列表，并自动生成受理和智能派单时间线。错误行不会导入。"
        />
      </Modal>

      <Modal
        title="导入行详情"
        open={Boolean(selectedRow)}
        onCancel={() => setSelectedRow(null)}
        footer={selectedRow?.importedComplaintId ? (
          <Button type="primary" onClick={() => navigate(`/complaints/${selectedRow.importedComplaintId}`)}>
            查看投诉详情
          </Button>
        ) : null}
      >
        {selectedRow && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="行号">{selectedRow.rowNo}</Descriptions.Item>
            <Descriptions.Item label="标题">{selectedRow.title}</Descriptions.Item>
            <Descriptions.Item label="分类">{buildCategoryName(selectedRow.categoryId) || selectedRow.categoryText}</Descriptions.Item>
            <Descriptions.Item label="区域">{areas.find((area) => area.id === selectedRow.areaId)?.name || selectedRow.areaText}</Descriptions.Item>
            <Descriptions.Item label="责任单位">
              {departments.find((department) => department.id === selectedRow.departmentId)?.name || selectedRow.departmentText}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">{selectedRow.contactName || '-'}</Descriptions.Item>
            <Descriptions.Item label="电话">{selectedRow.contactPhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="缺失字段">
              {selectedRow.missingFields.length ? selectedRow.missingFields.join('、') : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="错误摘要">
              {[...selectedRow.errors, ...selectedRow.warnings].join('；') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="内容">{selectedRow.content}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default BatchImport;
