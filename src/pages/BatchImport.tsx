import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  Upload,
  Space,
  Tag,
  message,
  Progress,
  Statistic,
  Row,
  Col,
  Divider,
  Alert,
  Modal,
  Tabs,
  Empty,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  Upload as UploadIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Send,
  RotateCcw,
  FileCheck,
  FileX,
  Building2,
  MapPin,
  List,
  Download,
  History,
  Eye,
  ExternalLink,
  FileDown,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { Complaint, TimelineRecord } from '@/types';
import { categories, areas, departments } from '@/data/dictionaries';
import { StatusTag } from '@/components/StatusTags';

interface ParsedRow {
  rowIndex: number;
  title?: string;
  content?: string;
  categoryName?: string;
  areaName?: string;
  departmentName?: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  errors: string[];
  warnings: string[];
  categoryId?: string;
  areaId?: string;
  departmentId?: string;
  importedId?: string;
  importStatus?: 'success' | 'failed' | 'pending';
}

interface ImportRecord {
  id: string;
  fileName: string;
  importTime: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  operator: string;
  status: 'completed' | 'partial' | 'failed';
}

const generateMockHistory = (): ImportRecord[] => [
  {
    id: 'IMP001',
    fileName: '2024年6月投诉批量导入.xlsx',
    importTime: '2024-06-05 14:30:25',
    totalCount: 25,
    successCount: 23,
    failedCount: 2,
    operator: '李督办',
    status: 'partial',
  },
  {
    id: 'IMP002',
    fileName: '热线投诉汇总0603.csv',
    importTime: '2024-06-03 09:15:42',
    totalCount: 50,
    successCount: 50,
    failedCount: 0,
    operator: '王管理员',
    status: 'completed',
  },
  {
    id: 'IMP003',
    fileName: '市容环境专项投诉.xlsx',
    importTime: '2024-06-01 16:45:10',
    totalCount: 18,
    successCount: 18,
    failedCount: 0,
    operator: '张经办',
    status: 'completed',
  },
];

const BatchImport: React.FC = () => {
  const navigate = useNavigate();
  const { addComplaint, complaints, user } = useAppStore();
  const [activeTab, setActiveTab] = useState('import');
  const [fileList, setFileList] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    total: number;
    successIds: string[];
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ParsedRow | null>(null);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [importHistory] = useState<ImportRecord[]>(generateMockHistory());

  const validateRow = (row: Partial<ParsedRow>): string[] => {
    const errors: string[] = [];

    if (!row.title || row.title.trim() === '') {
      errors.push('缺少投诉标题');
    } else if (row.title.length > 100) {
      errors.push('投诉标题超过100字限制');
    }

    if (!row.content || row.content.trim() === '') {
      errors.push('缺少投诉内容');
    } else if (row.content.length > 1000) {
      errors.push('投诉内容超过1000字限制');
    }

    if (!row.categoryName || row.categoryName.trim() === '') {
      errors.push('缺少事项分类');
    }

    if (!row.areaName || row.areaName.trim() === '') {
      errors.push('缺少所属区域');
    }

    if (!row.contactName || row.contactName.trim() === '') {
      errors.push('缺少联系人姓名');
    }

    if (!row.contactPhone || row.contactPhone.trim() === '') {
      errors.push('缺少联系电话');
    } else if (!/^1[3-9]\d{9}$/.test(row.contactPhone)) {
      errors.push('联系电话格式不正确');
    }

    return errors;
  };

  const generateWarnings = (row: ParsedRow): string[] => {
    const warnings: string[] = [];

    if (!row.departmentName || row.departmentName.trim() === '') {
      warnings.push('未指定责任单位，将由系统自动派单');
    } else {
      const dept = departments.find((d) => d.name === row.departmentName);
      if (!dept) {
        warnings.push('责任单位名称不匹配，将使用系统推荐');
      } else if (row.categoryId) {
        const category = categories.find((c) => c.id === row.categoryId);
        const parentCategory = categories.find((c) => c.id === category?.parentId);
        const expectedDeptMap: Record<string, string> = {
          c1: '城市管理委员会',
          c2: '交通运输局',
          c3: '生态环境局',
          c4: '园林绿化局',
          c5: '住房和城乡建设局',
        };
        const expectedDept = expectedDeptMap[parentCategory?.id || ''];
        if (expectedDept && expectedDept !== row.departmentName) {
          warnings.push('责任单位与分类匹配度较低，建议核实');
        }
      }
    }

    if (!row.address || row.address.trim() === '') {
      warnings.push('未填写详细地址，可能影响派单精准度');
    }

    return warnings;
  };

  const mockParseFile = (): ParsedRow[] => {
    const mockRows: Partial<ParsedRow>[] = [
      {
        rowIndex: 1,
        title: '朝阳路占道经营严重影响通行',
        content: '朝阳路与建国路交叉口，每天傍晚都有大量流动摊贩占道经营，导致行人无法正常通行，存在交通安全隐患。',
        categoryName: '城市管理 - 占道经营',
        areaName: '朝阳区',
        contactName: '张三',
        contactPhone: '13800138001',
        address: '朝阳路与建国路交叉口',
      },
      {
        rowIndex: 2,
        title: '小区垃圾清运不及时异味严重',
        content: '阳光小区3号楼前的垃圾桶已经3天没有清运了，天气炎热导致异味严重，影响居民生活。',
        categoryName: '城市管理 - 市容环境',
        areaName: '海淀区',
        departmentName: '城市管理委员会',
        contactName: '李四',
        contactPhone: '13900139002',
        address: '阳光小区3号楼',
      },
      {
        rowIndex: 3,
        title: '',
        content: '最近施工噪音太大，晚上睡不着觉',
        categoryName: '环境保护 - 噪音污染',
        areaName: '西城区',
        contactName: '',
        contactPhone: '12345',
      },
      {
        rowIndex: 4,
        title: '路灯损坏夜间行走不便',
        content: '人民公园东门附近的路灯坏了，晚上很黑，不安全。',
        categoryName: '市政设施 - 道路养护',
        areaName: '东城区',
        departmentName: '园林绿化局',
        contactName: '王五',
        contactPhone: '13700137004',
        address: '人民公园东门',
      },
      {
        rowIndex: 5,
        title: '公交站点设置不合理出行不便',
        content: '新开的居民区附近没有公交站，居民出行很不方便，希望能增设公交站点。',
        categoryName: '交通运输 - 公共交通',
        areaName: '通州区',
        departmentName: '交通运输局',
        contactName: '赵六',
        contactPhone: '13600136005',
        address: '幸福家园小区门口',
      },
      {
        rowIndex: 6,
        title: '违章建筑搭建存在安全隐患',
        content: '',
        categoryName: '城市管理 - 违章建筑',
        areaName: '丰台区',
        contactName: '孙七',
        contactPhone: '13500135006',
        address: '丰台南路88号',
      },
      {
        rowIndex: 7,
        title: '下水道堵塞污水外溢',
        content: '老旧小区下水道经常堵塞，下雨天污水外溢，影响环境卫生。',
        categoryName: '市政设施 - 供水供电',
        areaName: '石景山区',
        departmentName: '水务局',
        contactName: '周八',
        contactPhone: '13400134007',
      },
      {
        rowIndex: 8,
        title: '停车位紧张乱停乱放现象严重',
        content: '小区内停车位严重不足，车辆乱停乱放，堵塞消防通道，存在安全隐患。',
        categoryName: '交通运输 - 停车管理',
        areaName: '大兴区',
        contactName: '吴九',
        contactPhone: '13300133008',
        address: '兴旺小区',
      },
      {
        rowIndex: 9,
        title: '公园设施老化需要维护',
        content: '中山公园的健身器材都生锈了，有些已经损坏，存在安全隐患，希望能及时维护更新。',
        categoryName: '市政设施 - 园林绿化',
        areaName: '朝阳区',
        departmentName: '园林绿化局',
        contactName: '郑十',
        contactPhone: '13200132009',
        address: '中山公园内',
      },
      {
        rowIndex: 10,
        title: '餐饮店油烟污染影响居民生活',
        content: '楼下的餐饮店油烟直接排到小区里，味道很大，窗户都不敢开。',
        categoryName: '环境保护 - 大气污染',
        areaName: '海淀区',
        departmentName: '生态环境局',
        contactName: '冯十一',
        contactPhone: '13100131010',
        address: '学院路15号',
      },
      {
        rowIndex: 11,
        title: '广场舞噪音扰民',
        content: '小区广场每天早上6点就开始跳广场舞，音乐声音很大，严重影响居民休息。',
        categoryName: '环境保护 - 噪音污染',
        areaName: '西城区',
        contactName: '陈十二',
        contactPhone: '13000130011',
        address: '和谐家园小区广场',
      },
      {
        rowIndex: 12,
        title: '共享单车乱停放',
        content: '地铁站口共享单车乱停乱放，占用人行道，影响行人通行。',
        categoryName: '城市管理 - 市容环境',
        areaName: '朝阳区',
        departmentName: '城市管理委员会',
        contactName: '褚十三',
        contactPhone: '15800158012',
        address: '国贸地铁站C口',
      },
    ];

    return mockRows.map((row) => {
      const parsedRow: ParsedRow = {
        ...row,
        errors: [],
        warnings: [],
        importStatus: 'pending',
      } as ParsedRow;

      if (parsedRow.categoryName) {
        const parts = parsedRow.categoryName.split(/[—\-–]/).map(s => s.trim());
        if (parts.length >= 2) {
          const parentName = parts[0];
          const subName = parts[1];
          const parentCat = categories.find((c) => c.name === parentName && !c.parentId);
          if (parentCat) {
            const subCat = categories.find(
              (c) => c.name === subName && c.parentId === parentCat.id
            );
            if (subCat) {
              parsedRow.categoryId = subCat.id;
            } else {
              if (!parsedRow.errors.includes('分类名称不匹配')) {
                parsedRow.errors.push('子分类名称不匹配');
              }
            }
          } else {
            if (!parsedRow.errors.includes('分类名称不匹配')) {
              parsedRow.errors.push('大类名称不匹配');
            }
          }
        }
      }

      if (parsedRow.areaName) {
        const area = areas.find((a) => a.name === parsedRow.areaName);
        if (area) {
          parsedRow.areaId = area.id;
        } else {
          if (!parsedRow.errors.includes('区域名称不匹配')) {
            parsedRow.errors.push('区域名称不匹配');
          }
        }
      }

      if (parsedRow.departmentName) {
        const dept = departments.find((d) => d.name === parsedRow.departmentName);
        if (dept) {
          parsedRow.departmentId = dept.id;
        }
      }

      const validationErrors = validateRow(parsedRow);
      parsedRow.errors = [...parsedRow.errors, ...validationErrors];

      if (parsedRow.errors.length === 0) {
        parsedRow.warnings = generateWarnings(parsedRow);
      }

      return parsedRow;
    });
  };

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: (file) => {
      setFileList([file]);
      setIsParsing(true);
      setParsedData([]);
      setImportResult(null);
      setShowResultDetail(false);

      setTimeout(() => {
        const mockData = mockParseFile();
        setParsedData(mockData);
        setIsParsing(false);
        const errorCount = mockData.filter((r) => r.errors.length > 0).length;
        if (errorCount > 0) {
          message.warning(
            `文件解析完成，共识别 ${mockData.length} 条记录，其中 ${errorCount} 条存在错误`
          );
        } else {
          message.success(`文件解析完成，共识别 ${mockData.length} 条记录`);
        }
      }, 1500);

      return false;
    },
    onRemove: () => {
      setFileList([]);
      setParsedData([]);
      setImportResult(null);
      setShowResultDetail(false);
    },
    maxCount: 1,
    accept: '.xlsx,.xls,.csv',
  };

  const stats = useMemo(() => {
    const total = parsedData.length;
    const valid = parsedData.filter((row) => row.errors.length === 0).length;
    const invalid = total - valid;
    const hasWarnings = parsedData.filter(
      (row) => row.warnings.length > 0 && row.errors.length === 0
    ).length;

    const categoryStats = new Map<string, number>();
    const areaStats = new Map<string, number>();
    const deptStats = new Map<string, number>();

    parsedData
      .filter((row) => row.errors.length === 0)
      .forEach((row) => {
        if (row.categoryName) {
          categoryStats.set(
            row.categoryName,
            (categoryStats.get(row.categoryName) || 0) + 1
          );
        }
        if (row.areaName) {
          areaStats.set(row.areaName, (areaStats.get(row.areaName) || 0) + 1);
        }
        const deptName = row.departmentName || '待系统派单';
        deptStats.set(deptName, (deptStats.get(deptName) || 0) + 1);
      });

    return {
      total,
      valid,
      invalid,
      hasWarnings,
      categoryStats: Array.from(categoryStats.entries()).map(([name, count]) => ({
        name,
        count,
      })),
      areaStats: Array.from(areaStats.entries()).map(([name, count]) => ({
        name,
        count,
      })),
      deptStats: Array.from(deptStats.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }, [parsedData]);

  const getAutoAssignDepartment = (categoryId?: string): { id: string; name: string } => {
    if (!categoryId) return { id: departments[0].id, name: departments[0].name };

    const category = categories.find((c) => c.id === categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);

    const mapping: Record<string, string> = {
      c1: 'd1',
      c2: 'd2',
      c3: 'd3',
      c4: 'd5',
      c5: 'd4',
    };

    const deptId = mapping[parentCategory?.id || ''] || departments[0].id;
    const deptName = departments.find((d) => d.id === deptId)?.name || '';
    return { id: deptId, name: deptName };
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((row) => row.errors.length === 0);
    if (validRows.length === 0) {
      message.error('没有可导入的有效数据');
      return;
    }

    Modal.confirm({
      title: '确认批量导入',
      content: (
        <div className="space-y-2">
          <p>确定要导入以下投诉记录吗？</p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p>• 待导入数量：<span className="font-semibold text-blue-600">{validRows.length} 条</span></p>
            <p>• 导入来源：批量导入（后台录入）</p>
            <p>• 办理时限：5 个工作日</p>
            <p>• 派单方式：系统智能派单</p>
          </div>
          <p className="text-orange-500 text-sm">
            <AlertTriangle size={14} className="inline mr-1" />
            导入后数据将自动受理并派单至责任单位，请谨慎操作
          </p>
        </div>
      ),
      okText: '确认导入',
      cancelText: '取消',
      okButtonProps: { type: 'primary' },
      onOk: async () => {
        setImporting(true);
        setImportProgress(0);

        let successCount = 0;
        let failCount = 0;
        const successIds: string[] = [];
        const now = dayjs();
        const baseIdNum = parseInt(complaints[0]?.id?.replace('C', '') || '60', 10);

        const updatedData = [...parsedData];

        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          const originalIndex = parsedData.findIndex((r) => r.rowIndex === row.rowIndex);
          try {
            const newIdNum = baseIdNum + successCount + 1;
            const newId = `C${String(newIdNum).padStart(5, '0')}`;
            const category = categories.find((c) => c.id === row.categoryId);
            const parentCategory = categories.find(
              (c) => c.id === category?.parentId
            );
            const area = areas.find((a) => a.id === row.areaId);

            let deptId = row.departmentId;
            let deptName = row.departmentName;

            if (!deptId) {
              const autoDept = getAutoAssignDepartment(row.categoryId);
              deptId = autoDept.id;
              deptName = autoDept.name;
            }

            const acceptTimeline: TimelineRecord = {
              id: `${newId}-t1`,
              complaintId: newId,
              type: 'accept',
              operator: '批量导入',
              content: '投诉已通过批量导入受理',
              createdAt: now.add(i * 10, 'second').format('YYYY-MM-DD HH:mm:ss'),
            };

            const assignTimeline: TimelineRecord = {
              id: `${newId}-t2`,
              complaintId: newId,
              type: 'assign',
              operator: '智能派单系统',
              content: `根据区域和分类自动派单至${deptName}`,
              createdAt: now
                .add(i * 10 + 5, 'minute')
                .format('YYYY-MM-DD HH:mm:ss'),
            };

            const newComplaint: Complaint = {
              id: newId,
              title: row.title || '',
              content: row.content || '',
              source: 'backend',
              status: 'processing',
              categoryId: row.categoryId || '',
              categoryName:
                row.categoryName ||
                `${parentCategory?.name || ''} - ${category?.name || ''}`,
              areaId: row.areaId || '',
              areaName: area?.name || row.areaName || '',
              departmentId: deptId || '',
              departmentName: deptName || '',
              createdAt: now
                .add(i * 10, 'second')
                .format('YYYY-MM-DD HH:mm:ss'),
              deadline: now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
              contactName: row.contactName || '',
              contactPhone: row.contactPhone || '',
              address: row.address,
              isRepeat: false,
              urgeCount: 0,
              timelines: [acceptTimeline, assignTimeline],
            };

            addComplaint(newComplaint);
            successCount++;
            successIds.push(newId);

            if (originalIndex >= 0) {
              updatedData[originalIndex] = {
                ...updatedData[originalIndex],
                importStatus: 'success',
                importedId: newId,
              };
            }
          } catch {
            failCount++;
            if (originalIndex >= 0) {
              updatedData[originalIndex] = {
                ...updatedData[originalIndex],
                importStatus: 'failed',
                errors: [...updatedData[originalIndex].errors, '系统异常，导入失败'],
              };
            }
          }
          setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setParsedData(updatedData);
        setImporting(false);
        setImportResult({
          success: successCount,
          failed: failCount,
          total: validRows.length,
          successIds,
        });

        if (successCount > 0) {
          message.success(`成功导入 ${successCount} 条投诉记录`);
        }
        if (failCount > 0) {
          message.error(`${failCount} 条记录导入失败`);
        }
      },
    });
  };

  const handleReset = () => {
    setFileList([]);
    setParsedData([]);
    setImportResult(null);
    setImportProgress(0);
    setShowResultDetail(false);
  };

  const handleViewDetail = (record: ParsedRow) => {
    setPreviewRecord(record);
    setPreviewVisible(true);
  };

  const handleDownloadTemplate = () => {
    message.info('模板下载功能开发中，将下载标准 Excel 导入模板');
  };

  const handleExportErrors = () => {
    message.info('错误数据导出功能开发中');
  };

  const handleGoToComplaints = () => {
    navigate('/complaints');
  };

  const handleViewImported = () => {
    setShowResultDetail(true);
  };

  const columns: ColumnsType<ParsedRow> = [
    {
      title: '行号',
      dataIndex: 'rowIndex',
      width: 70,
      fixed: 'left',
      render: (index) => (
        <span className="text-gray-400 font-mono text-sm">{index}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'errors',
      width: 80,
      fixed: 'left',
      render: (errors: string[], record) => {
        if (record.importStatus === 'success') {
          return (
            <Tag icon={<CheckCircle size={12} />} color="success">
              已导入
            </Tag>
          );
        }
        if (record.importStatus === 'failed') {
          return (
            <Tag icon={<XCircle size={12} />} color="error">
              导入失败
            </Tag>
          );
        }
        if (errors.length > 0) {
          return (
            <Tag icon={<XCircle size={12} />} color="error">
              错误
            </Tag>
          );
        }
        if (record.warnings.length > 0) {
          return (
            <Tag icon={<AlertTriangle size={12} />} color="warning">
              警告
            </Tag>
          );
        }
        return (
          <Tag icon={<CheckCircle size={12} />} color="success">
            正常
          </Tag>
        );
      },
    },
    {
      title: '投诉编号',
      dataIndex: 'importedId',
      width: 110,
      render: (id) =>
        id ? (
          <span className="text-blue-600 font-mono text-sm cursor-pointer hover:underline"
            onClick={() => navigate(`/complaints/${id}`)}
          >
            {id}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      title: '投诉标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
      render: (title, record) => (
        <div>
          <span className={record.errors.length > 0 ? 'text-red-500' : 'text-gray-800'}>
            {title || <span className="text-gray-300">（空）</span>}
          </span>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      width: 140,
      ellipsis: true,
    },
    {
      title: '区域',
      dataIndex: 'areaName',
      width: 100,
    },
    {
      title: '责任单位',
      dataIndex: 'departmentName',
      width: 160,
      render: (name) => name || <span className="text-gray-400">系统自动派单</span>,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      width: 90,
      render: (name, record) => (
        <span className={record.errors.some((e) => e.includes('联系人')) ? 'text-red-500' : ''}>
          {name || <span className="text-gray-300">（空）</span>}
        </span>
      ),
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      width: 130,
      render: (phone, record) => (
        <span
          className={
            record.errors.some((e) => e.includes('电话')) ? 'text-red-500' : 'font-mono text-sm'
          }
        >
          {phone || <span className="text-gray-300">（空）</span>}
        </span>
      ),
    },
    {
      title: '错误/警告',
      key: 'issues',
      width: 200,
      render: (_, record) => {
        const issues = [...record.errors, ...record.warnings];
        if (issues.length === 0) return <span className="text-gray-300">-</span>;
        return (
          <div className="max-h-16 overflow-hidden">
            {issues.slice(0, 2).map((issue, idx) => (
              <div
                key={idx}
                className={`text-xs truncate ${
                  idx < record.errors.length ? 'text-red-500' : 'text-orange-500'
                }`}
              >
                • {issue}
              </div>
            ))}
            {issues.length > 2 && (
              <div className="text-xs text-gray-400">等 {issues.length} 项</div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.importedId && (
            <Button
              type="link"
              size="small"
              icon={<ExternalLink size={12} />}
              onClick={() => navigate(`/complaints/${record.importedId}`)}
            >
              查看
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const historyColumns: ColumnsType<ImportRecord> = [
    {
      title: '导入批次',
      dataIndex: 'id',
      width: 100,
      render: (id) => <span className="font-mono text-blue-600">{id}</span>,
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      width: 240,
      ellipsis: true,
      render: (name) => (
        <span className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-green-500" />
          {name}
        </span>
      ),
    },
    {
      title: '导入时间',
      dataIndex: 'importTime',
      width: 170,
      render: (time) => (
        <span className="text-gray-500 flex items-center gap-1">
          <Clock size={14} />
          {time}
        </span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 100,
    },
    {
      title: '总记录数',
      dataIndex: 'totalCount',
      width: 100,
      align: 'center',
      render: (count) => <Tag>{count} 条</Tag>,
    },
    {
      title: '成功',
      dataIndex: 'successCount',
      width: 100,
      align: 'center',
      render: (count) => <Tag color="success">{count} 条</Tag>,
    },
    {
      title: '失败',
      dataIndex: 'failedCount',
      width: 100,
      align: 'center',
      render: (count) =>
        count > 0 ? <Tag color="error">{count} 条</Tag> : <Tag>0 条</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          completed: { text: '全部成功', color: 'success' },
          partial: { text: '部分成功', color: 'warning' },
          failed: { text: '全部失败', color: 'error' },
        };
        const info = statusMap[status] || statusMap.completed;
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: () => (
        <Space size="small">
          <Button type="link" size="small" icon={<Eye size={12} />}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  const UploadSection = () => (
    <Card className="mb-4">
      <div className="text-center py-8">
        <Upload.Dragger {...uploadProps} className="!border-dashed" disabled={isParsing}>
          <p className="ant-upload-drag-icon">
            <FileSpreadsheet size={48} className="text-blue-500 mx-auto" />
          </p>
          <p className="ant-upload-text text-lg font-medium text-gray-700">
            {isParsing ? '正在解析文件...' : '点击或拖拽文件到此处上传'}
          </p>
          <p className="ant-upload-hint text-gray-400">
            支持 Excel (.xlsx, .xls) 和 CSV 格式，单次最多导入 500 条记录
          </p>
        </Upload.Dragger>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="text-left bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
              <FileCheck size={16} />
              导入格式说明
            </h4>
            <div className="text-sm text-blue-600 space-y-1">
              <p>• 必填字段：投诉标题、投诉内容、事项分类、所属区域、联系人、联系电话</p>
              <p>• 可选字段：责任单位、详细地址</p>
              <p>• 分类格式：大类 - 子类，如「城市管理 - 占道经营」</p>
              <p>• 系统将自动根据分类和区域匹配责任单位，并执行智能派单</p>
            </div>
          </div>
          <div className="text-left bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
              <Download size={16} />
              模板下载
            </h4>
            <div className="text-sm text-green-600 space-y-2">
              <p>请使用标准模板进行数据整理，以确保导入成功率</p>
              <Button
                type="primary"
                size="small"
                icon={<FileDown size={14} />}
                onClick={handleDownloadTemplate}
                className="bg-green-500 hover:bg-green-600"
              >
                下载导入模板
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const StatsSection = () => (
    <Row gutter={[16, 16]} className="mb-4">
      <Col span={6}>
        <Card className="text-center">
          <Statistic
            title="总记录数"
            value={stats.total}
            prefix={<FileSpreadsheet size={18} className="text-gray-400" />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card className="text-center">
          <Statistic
            title="有效记录"
            value={stats.valid}
            prefix={<CheckCircle size={18} className="text-green-400" />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card className="text-center">
          <Statistic
            title="错误记录"
            value={stats.invalid}
            prefix={<XCircle size={18} className="text-red-400" />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card className="text-center">
          <Statistic
            title="需关注记录"
            value={stats.hasWarnings}
            prefix={<AlertTriangle size={18} className="text-orange-400" />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const AnalysisSection = () => (
    <Row gutter={[16, 16]} className="mb-4">
      <Col span={8}>
        <Card title={<span className="flex items-center gap-2"><List size={16} className="text-blue-500" />分类分布</span>} size="small">
          <div className="space-y-2">
            {stats.categoryStats.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate" title={item.name}>
                  {item.name}
                </span>
                <Tag color="blue">{item.count}条</Tag>
              </div>
            ))}
            {stats.categoryStats.length === 0 && (
              <div className="text-gray-400 text-sm text-center py-2">暂无数据</div>
            )}
          </div>
        </Card>
      </Col>
      <Col span={8}>
        <Card title={<span className="flex items-center gap-2"><MapPin size={16} className="text-green-500" />区域分布</span>} size="small">
          <div className="space-y-2">
            {stats.areaStats.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.name}</span>
                <Tag color="green">{item.count}条</Tag>
              </div>
            ))}
            {stats.areaStats.length === 0 && (
              <div className="text-gray-400 text-sm text-center py-2">暂无数据</div>
            )}
          </div>
        </Card>
      </Col>
      <Col span={8}>
        <Card title={<span className="flex items-center gap-2"><Building2 size={16} className="text-purple-500" />责任单位分布</span>} size="small">
          <div className="space-y-2">
            {stats.deptStats.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate" title={item.name}>
                  {item.name}
                </span>
                <Tag color="purple">{item.count}条</Tag>
              </div>
            ))}
            {stats.deptStats.length === 0 && (
              <div className="text-gray-400 text-sm text-center py-2">暂无数据</div>
            )}
          </div>
        </Card>
      </Col>
    </Row>
  );

  const ImportResultSection = () => {
    if (!importResult) return null;

    return (
      <Alert
        message={
          <div className="flex items-center justify-between">
            <span>
              导入完成：成功 <span className="font-semibold text-green-600">{importResult.success}</span> 条，
              失败 <span className="font-semibold text-red-500">{importResult.failed}</span> 条
            </span>
            <Space>
              <Button size="small" type="link" onClick={handleViewImported}>
                查看导入详情
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<ExternalLink size={14} />}
                onClick={handleGoToComplaints}
              >
                前往投诉列表
              </Button>
            </Space>
          </div>
        }
        type={importResult.failed > 0 ? 'warning' : 'success'}
        showIcon
      />
    );
  };

  const tabItems = [
    {
      key: 'import',
      label: (
        <span className="flex items-center gap-2">
          <UploadIcon size={16} />
          导入预览
        </span>
      ),
      children: (
        <div className="space-y-4">
          {importing && (
            <Alert
              message="正在导入数据..."
              description={
                <Progress
                  percent={importProgress}
                  status="active"
                  strokeColor={{ from: '#1890ff', to: '#52c41a' }}
                />
              }
              type="info"
              showIcon
            />
          )}

          {importResult && <ImportResultSection />}

          {parsedData.length === 0 ? (
            <UploadSection />
          ) : (
            <>
              {!showResultDetail && (
                <>
                  <StatsSection />
                  <AnalysisSection />
                </>
              )}

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">
                      {showResultDetail ? '导入结果详情' : '数据预览'}
                    </span>
                    <span className="text-sm text-gray-400">
                      共 {parsedData.length} 条记录
                    </span>
                  </div>
                  <Space size="small">
                    <Tag color="success">正常: {stats.valid} 条</Tag>
                    <Tag color="error">错误: {stats.invalid} 条</Tag>
                    <Tag color="warning">警告: {stats.hasWarnings} 条</Tag>
                    {stats.invalid > 0 && (
                      <Button
                        size="small"
                        icon={<FileDown size={14} />}
                        onClick={handleExportErrors}
                      >
                        导出错误数据
                      </Button>
                    )}
                  </Space>
                </div>

                <Table
                  rowKey="rowIndex"
                  columns={columns}
                  dataSource={parsedData}
                  scroll={{ x: 1400, y: 400 }}
                  pagination={false}
                  size="small"
                  rowClassName={(record) =>
                    record.importStatus === 'success'
                      ? 'bg-green-50'
                      : record.importStatus === 'failed'
                      ? 'bg-red-50'
                      : record.errors.length > 0
                      ? 'bg-red-50'
                      : record.warnings.length > 0
                      ? 'bg-orange-50'
                      : ''
                  }
                />

                <Divider />

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {showResultDetail ? (
                      <Button type="link" size="small" onClick={() => setShowResultDetail(false)}>
                        ← 返回统计视图
                      </Button>
                    ) : (
                      <>
                        <FileX size={14} className="inline mr-1 text-red-500" />
                        红色行表示存在错误，无法导入；
                        <AlertTriangle
                          size={14}
                          className="inline mx-1 text-orange-500"
                        />
                        橙色行表示存在警告，可导入但建议核实
                      </>
                    )}
                  </div>
                  <Space>
                    {!showResultDetail && (
                      <>
                        <Button icon={<RotateCcw size={16} />} onClick={handleReset}>
                          重新上传
                        </Button>
                        <Button
                          type="primary"
                          icon={<Send size={16} />}
                          onClick={handleImport}
                          disabled={stats.valid === 0 || importing || !!importResult}
                          loading={importing}
                        >
                          确认导入 {stats.valid} 条有效记录
                        </Button>
                      </>
                    )}
                    {showResultDetail && (
                      <>
                        <Button icon={<RotateCcw size={16} />} onClick={handleReset}>
                          继续导入
                        </Button>
                        <Button
                          type="primary"
                          icon={<ExternalLink size={16} />}
                          onClick={handleGoToComplaints}
                        >
                          查看投诉列表
                        </Button>
                      </>
                    )}
                  </Space>
                </div>
              </Card>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-2">
          <History size={16} />
          导入历史
        </span>
      ),
      children: (
        <Card>
          <Table
            rowKey="id"
            columns={historyColumns}
            dataSource={importHistory}
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">批量录入预览</h2>
          <p className="text-gray-400 text-sm mt-1">
            一次性导入多条投诉，支持 Excel/CSV 格式，系统自动识别分类、区域和责任单位
          </p>
        </div>
        <Space>
          {activeTab === 'import' && parsedData.length > 0 && !importResult && (
            <>
              <Button icon={<RotateCcw size={16} />} onClick={handleReset}>
                重新上传
              </Button>
              <Button
                type="primary"
                icon={<Send size={16} />}
                onClick={handleImport}
                disabled={stats.valid === 0 || importing}
                loading={importing}
              >
                确认导入 ({stats.valid})
              </Button>
            </>
          )}
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="px-4 pt-2"
        />
      </Card>

      <Modal
        title="数据详情"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={650}
      >
        {previewRecord && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-500">状态：</span>
              {previewRecord.importStatus === 'success' ? (
                <Tag icon={<CheckCircle size={12} />} color="success">
                  已成功导入
                </Tag>
              ) : previewRecord.importStatus === 'failed' ? (
                <Tag icon={<XCircle size={12} />} color="error">
                  导入失败
                </Tag>
              ) : previewRecord.errors.length > 0 ? (
                <Tag icon={<XCircle size={12} />} color="error">
                  存在错误
                </Tag>
              ) : previewRecord.warnings.length > 0 ? (
                <Tag icon={<AlertTriangle size={12} />} color="warning">
                  存在警告
                </Tag>
              ) : (
                <Tag icon={<CheckCircle size={12} />} color="success">
                  正常
                </Tag>
              )}
              {previewRecord.importedId && (
                <span className="text-blue-600 font-mono text-sm">
                  投诉编号：{previewRecord.importedId}
                </span>
              )}
              <StatusTag status="processing" />
            </div>

            {previewRecord.errors.length > 0 && (
              <Alert
                message="错误信息"
                description={
                  <ul className="list-disc list-inside space-y-1">
                    {previewRecord.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
              />
            )}

            {previewRecord.warnings.length > 0 && (
              <Alert
                message="警告信息"
                description={
                  <ul className="list-disc list-inside space-y-1">
                    {previewRecord.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                }
                type="warning"
                showIcon
              />
            )}

            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="投诉标题" span={2}>
                {previewRecord.title || '（空）'}
              </Descriptions.Item>
              <Descriptions.Item label="事项分类">
                {previewRecord.categoryName || '（空）'}
              </Descriptions.Item>
              <Descriptions.Item label="所属区域">
                {previewRecord.areaName || '（空）'}
              </Descriptions.Item>
              <Descriptions.Item label="责任单位">
                {previewRecord.departmentName || '系统自动派单'}
              </Descriptions.Item>
              <Descriptions.Item label="联系人">
                {previewRecord.contactName || '（空）'}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话" className="font-mono">
                {previewRecord.contactPhone || '（空）'}
              </Descriptions.Item>
              <Descriptions.Item label="详细地址" span={2}>
                {previewRecord.address || '（空）'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <span className="text-gray-400 text-sm">投诉内容</span>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded mt-1">
                {previewRecord.content || '（空）'}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-medium text-blue-700 mb-2 text-sm flex items-center gap-2">
                <ChevronRight size={14} />
                导入后系统将执行以下操作
              </h4>
              <ul className="text-sm text-blue-600 space-y-1 pl-5">
                <li>自动生成投诉编号，来源标记为「后台录入」</li>
                <li>系统自动受理并创建受理时间线记录</li>
                <li>根据分类和区域智能派单至责任单位</li>
                <li>设置办理时限为 5 个工作日</li>
                <li>自动记录导入操作人信息</li>
              </ul>
            </div>

            {previewRecord.importedId && (
              <div className="flex justify-end">
                <Button
                  type="primary"
                  icon={<ExternalLink size={14} />}
                  onClick={() => {
                    setPreviewVisible(false);
                    navigate(`/complaints/${previewRecord.importedId}`);
                  }}
                >
                  查看投诉详情
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BatchImport;
