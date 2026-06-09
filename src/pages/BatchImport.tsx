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
  Input,
  Radio,
  Steps,
  Select,
  Badge,
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
  ClipboardPaste,
  GitMerge,
  PlusCircle,
  CheckSquare,
  Filter,
  Target,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { Complaint, TimelineRecord, DuplicateComplaintResult, DispatchRule } from '@/types';
import { categories, areas, departments } from '@/data/dictionaries';
import { StatusTag } from '@/components/StatusTags';
import { matchDispatchRule, getAllMatchingRules, getSimilarityLevel, getSimilarityColor, getSimilarityLabel } from '@/lib/utils';

type ImportStep = 'upload' | 'preview' | 'duplicate' | 'result';
type DuplicateAction = 'merge' | 'new';

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
  importStatus?: 'success' | 'failed' | 'pending' | 'merged';
  mergedIntoId?: string;
  dispatchRule?: DispatchRule | null;
  dispatchMatched?: boolean;
  dispatchMatchLevel?: 'exact' | 'category_only' | 'area_only' | 'none';
  dispatchRuleHits?: Array<{
    rule: DispatchRule;
    matchLevel: 'exact' | 'category_match' | 'area_match';
    matchLevelText: string;
    matchLevelOrder: number;
  }>;
  duplicates?: DuplicateComplaintResult[];
  hasDuplicates?: boolean;
  duplicateAction?: DuplicateAction;
  selectedMergeTargetId?: string;
  mergeValidationError?: string;
}

interface ImportRecord {
  id: string;
  fileName: string;
  importTime: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  mergedCount: number;
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
    mergedCount: 0,
    operator: '李督办',
    status: 'partial',
  },
  {
    id: 'IMP002',
    fileName: '热线投诉汇总0603.csv',
    importTime: '2024-06-03 09:15:42',
    totalCount: 50,
    successCount: 48,
    failedCount: 0,
    mergedCount: 2,
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
    mergedCount: 0,
    operator: '张经办',
    status: 'completed',
  },
];

const BatchImport: React.FC = () => {
  const navigate = useNavigate();
  const {
    addComplaint,
    complaints,
    user,
    detectDuplicates,
    matchDispatch,
    mergeComplaint,
    dispatchRules,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState('import');
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [fileList, setFileList] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    merged: number;
    total: number;
    successIds: string[];
    mergedIds: Array<{ sourceId: string; targetId: string }>;
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ParsedRow | null>(null);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [importHistory] = useState<ImportRecord[]>(generateMockHistory());
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'has' | 'none'>('all');

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

    if (!row.dispatchMatched) {
      warnings.push('未匹配到派单规则，将使用默认责任单位');
    } else if (row.dispatchMatchLevel !== 'exact') {
      warnings.push(`派单规则为${row.dispatchMatchLevel === 'category_only' ? '分类匹配' : '区域匹配'}，非精确匹配`);
    }

    return warnings;
  };

  const processRow = (row: Partial<ParsedRow>): ParsedRow => {
    const parsedRow: ParsedRow = {
      ...row,
      errors: [],
      warnings: [],
      importStatus: 'pending',
      duplicates: [],
      hasDuplicates: false,
      duplicateAction: 'new',
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
            if (!parsedRow.errors.includes('子分类名称不匹配')) {
              parsedRow.errors.push('子分类名称不匹配');
            }
          }
        } else {
          if (!parsedRow.errors.includes('大类名称不匹配')) {
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

    if (parsedRow.categoryId && parsedRow.areaId) {
      const dispatchResult = matchDispatchRule(parsedRow.categoryId, parsedRow.areaId, dispatchRules);
      parsedRow.dispatchMatched = dispatchResult.matched;
      parsedRow.dispatchMatchLevel = dispatchResult.matchLevel;
      parsedRow.dispatchRule = dispatchResult.rule || null;

      const allHits = getAllMatchingRules(parsedRow.categoryId, parsedRow.areaId, dispatchRules);
      parsedRow.dispatchRuleHits = allHits;

      if (dispatchResult.matched && dispatchResult.rule && !parsedRow.departmentId) {
        parsedRow.departmentId = dispatchResult.rule.departmentId;
        parsedRow.departmentName = dispatchResult.rule.departmentName;
      }
    } else {
      parsedRow.dispatchMatched = false;
      parsedRow.dispatchMatchLevel = 'none';
      parsedRow.dispatchRule = null;
      parsedRow.dispatchRuleHits = [];
    }

    const validationErrors = validateRow(parsedRow);
    parsedRow.errors = [...parsedRow.errors, ...validationErrors];

    if (parsedRow.errors.length === 0) {
      parsedRow.warnings = generateWarnings(parsedRow);

      if (parsedRow.categoryId && parsedRow.areaId && parsedRow.contactPhone) {
        const dupResult = detectDuplicates(
          {
            title: parsedRow.title || '',
            categoryId: parsedRow.categoryId,
            areaId: parsedRow.areaId,
            address: parsedRow.address,
            contactPhone: parsedRow.contactPhone,
          }
        );
        parsedRow.duplicates = dupResult;
        parsedRow.hasDuplicates = dupResult.length > 0;
        if (dupResult.length > 0) {
          parsedRow.selectedMergeTargetId = dupResult[0].complaint.id;
        }
      }
    }

    return parsedRow;
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

    return mockRows.map((row) => processRow(row));
  };

  const parsePasteText = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      let cells: string[];
      if (line.includes('\t')) {
        cells = line.split('\t').map(c => c.trim());
      } else {
        cells = line.split(',').map(c => c.trim());
      }
      if (cells.length < 6) continue;

      const row: Partial<ParsedRow> = {
        rowIndex: i,
        title: cells[0] || '',
        content: cells[1] || '',
        categoryName: cells[2] || '',
        areaName: cells[3] || '',
        contactName: cells[4] || '',
        contactPhone: cells[5] || '',
        address: cells[6] || '',
        departmentName: cells[7] || '',
      };
      rows.push(processRow(row));
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSVText = (text: string): ParsedRow[] => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const header = parseCSVLine(lines[0]);
    const hasTabHeader = header.some(h => h.includes('\t'));

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      let cells: string[];

      if (hasTabHeader || line.includes('\t')) {
        cells = line.split('\t').map(c => c.trim());
      } else {
        cells = parseCSVLine(line);
      }

      if (cells.length < 6) continue;

      const row: Partial<ParsedRow> = {
        rowIndex: i,
        title: cells[0] || '',
        content: cells[1] || '',
        categoryName: cells[2] || '',
        areaName: cells[3] || '',
        contactName: cells[4] || '',
        contactPhone: cells[5] || '',
        address: cells[6] || '',
        departmentName: cells[7] || '',
      };
      rows.push(processRow(row));
    }

    return rows;
  };

  const parseExcelFile = async (file: File): Promise<ParsedRow[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];

    const worksheet = workbook.Sheets[firstSheet];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (jsonData.length < 2) return [];

    const rows: ParsedRow[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      const parsedRow: Partial<ParsedRow> = {
        rowIndex: i,
        title: String(row[0] || '').trim(),
        content: String(row[1] || '').trim(),
        categoryName: String(row[2] || '').trim(),
        areaName: String(row[3] || '').trim(),
        contactName: String(row[4] || '').trim(),
        contactPhone: String(row[5] || '').trim(),
        address: String(row[6] || '').trim(),
        departmentName: String(row[7] || '').trim(),
      };
      rows.push(processRow(parsedRow));
    }

    return rows;
  };

  const parseUploadedFile = async (file: File): Promise<ParsedRow[]> => {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
      const text = await file.text();
      return parseCSVText(text);
    }

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      return parseExcelFile(file);
    }

    message.error('不支持的文件格式，请上传 Excel (.xlsx, .xls) 或 CSV 文件');
    return [];
  };

  const TEMPLATE_HEADERS = [
    '投诉标题', '投诉内容', '事项分类', '所属区域',
    '联系人', '联系电话', '详细地址', '责任单位'
  ];

  const TEMPLATE_EXAMPLE = [
    '朝阳路占道经营严重',
    '朝阳路摊贩占道经营，影响行人通行',
    '城市管理 - 占道经营',
    '朝阳区',
    '张三',
    '13800138001',
    '朝阳路路口',
    '城市管理委员会'
  ];

  const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
    const escapeCell = (cell: string) => {
      if (cell === null || cell === undefined) return '';
      const s = String(cell);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.map(escapeCell).join(','));
    rows.forEach(row => {
      csvLines.push(row.map(escapeCell).join(','));
    });

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (filename: string, headers: string[], rows: string[][]) => {
    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '投诉数据');
    XLSX.writeFile(workbook, filename);
  };

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: async (file) => {
      const lowerName = file.name.toLowerCase();
      const isValid = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
      if (!isValid) {
        message.error('请上传 Excel (.xlsx, .xls) 或 CSV 格式的文件');
        return Upload.LIST_IGNORE;
      }

      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }

      setFileList([file]);
      setIsParsing(true);
      setParsedData([]);
      setImportResult(null);
      setShowResultDetail(false);
      setCurrentStep('preview');

      try {
        const parsed = await parseUploadedFile(file);

        if (parsed.length === 0) {
          message.error('文件中未解析到有效数据，请检查文件格式');
          setIsParsing(false);
          setCurrentStep('upload');
          return Upload.LIST_IGNORE;
        }

        if (parsed.length > 500) {
          message.warning(`单次最多导入 500 条记录，已自动截断前 500 条`);
        }

        const finalData = parsed.slice(0, 500);
        setParsedData(finalData);
        setIsParsing(false);

        const errorCount = finalData.filter((r) => r.errors.length > 0).length;
        if (errorCount > 0) {
          message.warning(
            `文件解析完成，共识别 ${finalData.length} 条记录，其中 ${errorCount} 条存在错误`
          );
        } else {
          message.success(`文件解析完成，共识别 ${finalData.length} 条记录`);
        }
      } catch (err: any) {
        message.error(`文件解析失败：${err?.message || '未知错误'}`);
        setIsParsing(false);
        setCurrentStep('upload');
      }

      return Upload.LIST_IGNORE;
    },
    onRemove: () => {
      setFileList([]);
      setParsedData([]);
      setImportResult(null);
      setShowResultDetail(false);
      setCurrentStep('upload');
    },
    maxCount: 1,
    accept: '.xlsx,.xls,.csv',
  };

  const handlePasteConfirm = () => {
    const parsed = parsePasteText(pasteText);
    if (parsed.length === 0) {
      message.error('未解析到有效数据，请检查粘贴格式');
      return;
    }
    setParsedData(parsed);
    setPasteModalVisible(false);
    setPasteText('');
    setCurrentStep('preview');
    const errorCount = parsed.filter((r) => r.errors.length > 0).length;
    if (errorCount > 0) {
      message.warning(`解析完成，共识别 ${parsed.length} 条记录，其中 ${errorCount} 条存在错误`);
    } else {
      message.success(`解析完成，共识别 ${parsed.length} 条记录`);
    }
  };

  const stats = useMemo(() => {
    const total = parsedData.length;
    const valid = parsedData.filter((row) => row.errors.length === 0).length;
    const invalid = total - valid;
    const hasWarnings = parsedData.filter(
      (row) => row.warnings.length > 0 && row.errors.length === 0
    ).length;
    const hasDuplicates = parsedData.filter(
      (row) => row.hasDuplicates && row.errors.length === 0
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
      hasDuplicates,
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

  const filteredDuplicateRows = useMemo(() => {
    return parsedData.filter(row => {
      if (row.errors.length > 0) return false;
      if (duplicateFilter === 'all') return true;
      if (duplicateFilter === 'has') return row.hasDuplicates;
      if (duplicateFilter === 'none') return !row.hasDuplicates;
      return true;
    });
  }, [parsedData, duplicateFilter]);

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

  const handleDuplicateActionChange = (rowIndex: number, action: DuplicateAction) => {
    setParsedData(prev => prev.map(row =>
      row.rowIndex === rowIndex ? { ...row, duplicateAction: action } : row
    ));
  };

  const handleMergeTargetChange = (rowIndex: number, targetId: string) => {
    setParsedData(prev => prev.map(row =>
      row.rowIndex === rowIndex ? { ...row, selectedMergeTargetId: targetId } : row
    ));
  };

  const handleGoToDuplicateStep = () => {
    const validRows = parsedData.filter(row => row.errors.length === 0);
    if (validRows.length === 0) {
      message.error('没有可导入的有效数据');
      return;
    }
    setCurrentStep('duplicate');
  };

  const handleBackToPreview = () => {
    setCurrentStep('preview');
  };

  const validateMergeTargets = (): { valid: boolean; invalidRows: ParsedRow[] } => {
    const invalidRows: ParsedRow[] = [];
    const validRows = parsedData.filter(r => r.errors.length === 0);

    validRows.forEach(row => {
      if (row.hasDuplicates && row.duplicateAction === 'merge') {
        if (!row.selectedMergeTargetId) {
          invalidRows.push({ ...row, mergeValidationError: '未选择合并目标投诉' });
          return;
        }
        const targetExists = complaints.some(c => c.id === row.selectedMergeTargetId);
        if (!targetExists) {
          invalidRows.push({ ...row, mergeValidationError: `目标投诉 ${row.selectedMergeTargetId} 不存在或已被删除` });
        }
      }
    });

    return { valid: invalidRows.length === 0, invalidRows };
  };

  const buildComplaintObject = (
    row: ParsedRow,
    newId: string,
    createdAt: string,
    deadline: string,
    deptId: string,
    deptName: string,
    isRepeat: boolean,
    includeProcess: boolean
  ): Complaint => {
    const category = categories.find((c) => c.id === row.categoryId);
    const parentCategory = categories.find((c) => c.id === category?.parentId);
    const area = areas.find((a) => a.id === row.areaId);
    const now = dayjs(createdAt);

    const acceptTimeline: TimelineRecord = {
      id: `${newId}-t1`,
      complaintId: newId,
      type: 'accept',
      operator: '批量导入',
      content: '投诉已通过批量导入受理',
      createdAt,
    };

    const assignTimeline: TimelineRecord = {
      id: `${newId}-t2`,
      complaintId: newId,
      type: 'assign',
      operator: '智能派单系统',
      content: row.dispatchRule
        ? `根据派单规则「${row.dispatchRule.name}」自动派单至${deptName}`
        : `根据区域和分类自动派单至${deptName}`,
      createdAt: now.add(5, 'second').format('YYYY-MM-DD HH:mm:ss'),
      assignSource: 'auto',
    };

    const timelines: TimelineRecord[] = [acceptTimeline, assignTimeline];

    if (includeProcess) {
      timelines.push({
        id: `${newId}-t3`,
        complaintId: newId,
        type: 'process',
        operator: `${deptName} 工作人员`,
        content: '责任单位已接收工单，正在安排处理',
        createdAt: now.add(30, 'second').format('YYYY-MM-DD HH:mm:ss'),
      });
    }

    return {
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
      createdAt,
      deadline,
      contactName: row.contactName || '',
      contactPhone: row.contactPhone || '',
      address: row.address,
      isRepeat,
      urgeCount: 0,
      timelines,
      assignSource: 'auto',
      dispatchRuleId: row.dispatchRule?.id,
      dispatchRuleName: row.dispatchRule?.name,
    };
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((row) => row.errors.length === 0);
    if (validRows.length === 0) {
      message.error('没有可导入的有效数据');
      return;
    }

    const mergeValidation = validateMergeTargets();
    if (!mergeValidation.valid) {
      const invalidMergeCount = mergeValidation.invalidRows.length;
      Modal.warning({
        title: '合并目标校验未通过',
        content: (
          <div className="space-y-2">
            <p>以下 {invalidMergeCount} 条记录的合并目标存在问题，请修正后再导入：</p>
            <div className="max-h-64 overflow-auto bg-gray-50 rounded p-3 space-y-1">
              {mergeValidation.invalidRows.slice(0, 10).map(r => (
                <div key={r.rowIndex} className="text-sm">
                  <span className="text-gray-500">第{r.rowIndex}行：</span>
                  <span className="text-gray-700 truncate inline-block max-w-[200px] align-bottom">{r.title}</span>
                  <span className="text-red-500 ml-2">→ {r.mergeValidationError}</span>
                </div>
              ))}
              {invalidMergeCount > 10 && (
                <div className="text-gray-400 text-sm">...等 {invalidMergeCount} 条</div>
              )}
            </div>
          </div>
        ),
      });

      setParsedData(prev => prev.map(row => {
        const invalid = mergeValidation.invalidRows.find(ir => ir.rowIndex === row.rowIndex);
        if (invalid) {
          return { ...row, mergeValidationError: invalid.mergeValidationError };
        }
        return { ...row, mergeValidationError: undefined };
      }));
      return;
    }

    setParsedData(prev => prev.map(row => ({ ...row, mergeValidationError: undefined })));

    const mergeCount = validRows.filter(row => row.hasDuplicates && row.duplicateAction === 'merge').length;
    const newCount = validRows.length - mergeCount;

    Modal.confirm({
      title: '确认批量导入',
      content: (
        <div className="space-y-2">
          <p>确定要导入以下投诉记录吗？</p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p>• 待处理总数：<span className="font-semibold text-blue-600">{validRows.length} 条</span></p>
            <p>• 新建投诉：<span className="font-semibold text-green-600">{newCount} 条</span></p>
            <p>• 合并投诉：<span className="font-semibold text-orange-600">{mergeCount} 条</span></p>
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
        let mergedCount = 0;
        const successIds: string[] = [];
        const mergedIds: Array<{ sourceId: string; targetId: string }> = [];
        const now = dayjs();
        const baseIdNum = parseInt(complaints[0]?.id?.replace('C', '') || '60', 10);

        const updatedData = [...parsedData];

        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          const originalIndex = parsedData.findIndex((r) => r.rowIndex === row.rowIndex);
          try {
            const seqNum = successCount + mergedCount + failCount + 1;
            const newIdNum = baseIdNum + seqNum;
            const newId = `C${String(newIdNum).padStart(5, '0')}`;
            const createdAt = now.add(i * 10, 'second').format('YYYY-MM-DD HH:mm:ss');
            const deadline = now.add(5, 'day').format('YYYY-MM-DD HH:mm:ss');

            let deptId = row.departmentId;
            let deptName = row.departmentName;
            if (!deptId) {
              const autoDept = getAutoAssignDepartment(row.categoryId);
              deptId = autoDept.id;
              deptName = autoDept.name;
            }

            if (row.hasDuplicates && row.duplicateAction === 'merge' && row.selectedMergeTargetId) {
              const targetComplaint = complaints.find(c => c.id === row.selectedMergeTargetId);
              if (!targetComplaint) {
                throw new Error(`目标投诉 ${row.selectedMergeTargetId} 不存在`);
              }

              const sourceComplaint = buildComplaintObject(
                row, newId, createdAt, deadline, deptId, deptName, true, false
              );

              addComplaint(sourceComplaint);
              mergeComplaint(newId, row.selectedMergeTargetId, user?.name || '批量导入');

              mergedCount++;
              mergedIds.push({ sourceId: newId, targetId: row.selectedMergeTargetId });

              if (originalIndex >= 0) {
                updatedData[originalIndex] = {
                  ...updatedData[originalIndex],
                  importStatus: 'merged',
                  importedId: newId,
                  mergedIntoId: row.selectedMergeTargetId,
                  mergeValidationError: undefined,
                };
              }
            } else {
              const newComplaint = buildComplaintObject(
                row, newId, createdAt, deadline, deptId, deptName, false, true
              );

              addComplaint(newComplaint);
              successCount++;
              successIds.push(newId);

              if (originalIndex >= 0) {
                updatedData[originalIndex] = {
                  ...updatedData[originalIndex],
                  importStatus: 'success',
                  importedId: newId,
                  mergeValidationError: undefined,
                };
              }
            }
          } catch (err: any) {
            failCount++;
            if (originalIndex >= 0) {
              updatedData[originalIndex] = {
                ...updatedData[originalIndex],
                importStatus: 'failed',
                errors: [...updatedData[originalIndex].errors, err?.message || '系统异常，导入失败'],
                mergeValidationError: undefined,
              };
            }
          }
          setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setParsedData(updatedData);
        setImporting(false);
        setCurrentStep('result');
        setImportResult({
          success: successCount,
          failed: failCount,
          merged: mergedCount,
          total: validRows.length,
          successIds,
          mergedIds,
        });

        if (successCount > 0) {
          message.success(`成功导入 ${successCount} 条投诉记录`);
        }
        if (mergedCount > 0) {
          message.info(`合并 ${mergedCount} 条重复投诉`);
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
    setCurrentStep('upload');
    setDuplicateFilter('all');
  };

  const handleViewDetail = (record: ParsedRow) => {
    setPreviewRecord(record);
    setPreviewVisible(true);
  };

  const handleDownloadTemplate = () => {
    try {
      exportToExcel('投诉批量导入模板.xlsx', TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE]);
      message.success('模板下载成功');
    } catch (e) {
      exportToCSV('投诉批量导入模板.csv', TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE]);
      message.success('模板下载成功');
    }
  };

  const handleExportErrors = () => {
    const errorRows = parsedData.filter(r => r.errors.length > 0 || r.mergeValidationError);
    if (errorRows.length === 0) {
      message.info('没有需要导出的错误数据');
      return;
    }

    const headers = [...TEMPLATE_HEADERS, '错误信息'];
    const rows = errorRows.map(r => [
      r.title || '',
      r.content || '',
      r.categoryName || '',
      r.areaName || '',
      r.contactName || '',
      r.contactPhone || '',
      r.address || '',
      r.departmentName || '',
      [...r.errors, r.mergeValidationError || ''].filter(Boolean).join('；'),
    ]);

    const ts = dayjs().format('YYYYMMDD_HHmmss');
    try {
      exportToExcel(`导入错误数据_${ts}.xlsx`, headers, rows);
    } catch (e) {
      exportToCSV(`导入错误数据_${ts}.csv`, headers, rows);
    }
    message.success(`已导出 ${errorRows.length} 条错误数据`);
  };

  const handleGoToComplaints = () => {
    navigate('/complaints');
  };

  const handleViewImported = () => {
    setShowResultDetail(true);
  };

  const getStepStatus = (step: ImportStep): 'process' | 'finish' | 'wait' => {
    if (currentStep === step) return 'process';
    const order: ImportStep[] = ['upload', 'preview', 'duplicate', 'result'];
    return order.indexOf(currentStep) > order.indexOf(step) ? 'finish' : 'wait';
  };

  const stepItems = [
    {
      title: '数据上传',
      icon: <UploadIcon size={16} />,
      status: getStepStatus('upload'),
    },
    {
      title: '数据校验',
      icon: <FileCheck size={16} />,
      status: getStepStatus('preview'),
    },
    {
      title: '重复检测',
      icon: <GitMerge size={16} />,
      status: getStepStatus('duplicate'),
    },
    {
      title: '导入完成',
      icon: <CheckCircle size={16} />,
      status: getStepStatus('result'),
    },
  ];

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
      width: 90,
      fixed: 'left',
      render: (_: string[], record) => {
        if (record.importStatus === 'success') {
          return (
            <Tag icon={<CheckCircle size={12} />} color="success">
              已导入
            </Tag>
          );
        }
        if (record.importStatus === 'merged') {
          return (
            <Tag icon={<GitMerge size={12} />} color="orange">
              已合并
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
        if (record.errors.length > 0 || record.mergeValidationError) {
          return (
            <Tag icon={<XCircle size={12} />} color="error">
              错误
            </Tag>
          );
        }
        if (record.hasDuplicates) {
          return (
            <Tag icon={<GitMerge size={12} />} color="orange">
              疑似重复
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
      render: (id, record) =>
        id ? (
          <span className="text-blue-600 font-mono text-sm cursor-pointer hover:underline"
            onClick={() => navigate(`/complaints/${id}`)}
          >
            {id}
            {record.mergedIntoId && (
              <span className="text-orange-500 text-xs ml-1">→{record.mergedIntoId}</span>
            )}
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
      render: (name, record) => (
        <span className={record.errors.some(e => e.includes('分类')) ? 'text-red-500' : ''}>
          {name || <span className="text-gray-300">（空）</span>}
        </span>
      ),
    },
    {
      title: '区域',
      dataIndex: 'areaName',
      width: 100,
      render: (name, record) => (
        <span className={record.errors.some(e => e.includes('区域')) ? 'text-red-500' : ''}>
          {name || <span className="text-gray-300">（空）</span>}
        </span>
      ),
    },
    {
      title: '派单规则',
      key: 'dispatch',
      width: 200,
      render: (_, record) => {
        const hits = record.dispatchRuleHits || [];
        if (hits.length === 0) {
          return (
            <Tooltip title="该分类+区域未匹配到任何派单规则，将使用默认责任单位">
              <Tag icon={<AlertTriangle size={11} />} color="default">未匹配</Tag>
            </Tooltip>
          );
        }
        const topHit = hits[0];
        const levelColor: Record<string, string> = {
          exact: 'green',
          category_match: 'blue',
          area_match: 'cyan',
        };
        return (
          <Tooltip
            title={
              <div className="space-y-2 max-w-xs">
                <div className="font-medium mb-1">匹配到 {hits.length} 条派单规则（按优先级排序）</div>
                {hits.slice(0, 5).map((hit, idx) => (
                  <div key={hit.rule.id} className={idx === 0 ? 'bg-green-50 -mx-2 px-2 py-1 rounded' : ''}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-gray-500">{hit.rule.id}</span>
                      <Tag color={levelColor[hit.matchLevel]}>{hit.matchLevelText}</Tag>
                    </div>
                    <div className="text-sm font-medium mt-0.5">
                      {idx === 0 && <CheckCircle size={12} className="inline text-green-500 mr-1" />}
                      {hit.rule.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {hit.rule.categoryName} / {hit.rule.areaName} → {hit.rule.departmentName}
                    </div>
                    <div className="text-xs text-gray-400">优先级: {hit.rule.priority}</div>
                  </div>
                ))}
                {hits.length > 5 && (
                  <div className="text-xs text-gray-400">...等 {hits.length} 条规则</div>
                )}
              </div>
            }
          >
            <div>
              <Badge count={hits.length} size="small" offset={[4, 0]}>
                <Tag icon={<Zap size={11} />} color={levelColor[topHit.matchLevel]}>
                  {topHit.matchLevelText}
                </Tag>
              </Badge>
              <div className="text-xs text-gray-500 truncate mt-0.5" title={topHit.rule.departmentName}>
                <Target size={10} className="inline mr-0.5" />
                {topHit.rule.departmentName}
              </div>
            </div>
          </Tooltip>
        );
      },
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
      title: '重复投诉',
      key: 'duplicate',
      width: 120,
      render: (_, record) => {
        if (!record.hasDuplicates || record.duplicates.length === 0) {
          return <span className="text-gray-400">无</span>;
        }
        const top = record.duplicates[0];
        return (
          <Tooltip
            title={
              <div className="space-y-1">
                <div>相似度：<span style={{ color: getSimilarityColor(top.similarity) }}>{Math.round(top.similarity * 100)}%</span></div>
                <div>匹配原因：{top.matchReasons.join('、')}</div>
              </div>
            }
          >
            <Tag color={getSimilarityColor(top.similarity).replace('#', '')}>
              {getSimilarityLabel(top.similarity)} {Math.round(top.similarity * 100)}%
            </Tag>
            <div className="text-xs text-gray-500 truncate" title={top.complaint.id}>
              {top.complaint.id}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '错误/警告',
      key: 'issues',
      width: 220,
      render: (_, record) => {
        const errors = [...record.errors];
        if (record.mergeValidationError) {
          errors.push(record.mergeValidationError);
        }
        const issues = [...errors, ...record.warnings];
        if (issues.length === 0) return <span className="text-gray-300">-</span>;
        return (
          <div className="max-h-20 overflow-hidden">
            {issues.slice(0, 3).map((issue, idx) => (
              <div
                key={idx}
                className={`text-xs truncate ${
                  idx < errors.length ? 'text-red-500' : 'text-orange-500'
                }`}
              >
                • {issue}
              </div>
            ))}
            {issues.length > 3 && (
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

  const duplicateColumns: ColumnsType<ParsedRow> = [
    {
      title: '行号',
      dataIndex: 'rowIndex',
      width: 70,
      fixed: 'left',
    },
    {
      title: '投诉标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分类/区域',
      key: 'catArea',
      width: 160,
      render: (_, record) => (
        <div>
          <div className="text-sm text-gray-700">{record.categoryName}</div>
          <div className="text-xs text-gray-500">{record.areaName}</div>
        </div>
      ),
    },
    {
      title: '疑似重复投诉',
      key: 'dupList',
      width: 320,
      render: (_, record) => {
        if (!record.hasDuplicates || !record.duplicates || record.duplicates.length === 0) {
          return <span className="text-green-600">未检测到重复</span>;
        }
        return (
          <div className="space-y-2 max-h-40 overflow-auto">
            {record.duplicates.map((dup) => (
              <div
                key={dup.complaint.id}
                className="p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/complaints/${dup.complaint.id}`)}
                  >
                    {dup.complaint.id}
                  </span>
                  <Tag color={getSimilarityColor(dup.similarity).replace('#', '')} className="!mb-0">
                    {Math.round(dup.similarity * 100)}%
                  </Tag>
                </div>
                <div className="text-sm text-gray-700 truncate mt-1">{dup.complaint.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{dup.matchReasons.join('、')}</div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: '处理方式',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => {
        if (!record.hasDuplicates || !record.duplicates || record.duplicates.length === 0) {
          return <Tag color="green">作为新投诉</Tag>;
        }
        return (
          <div className="space-y-2">
            <Radio.Group
              value={record.duplicateAction}
              onChange={(e) => handleDuplicateActionChange(record.rowIndex, e.target.value)}
              size="small"
            >
              <Radio value="merge">
                <span className="flex items-center gap-1">
                  <GitMerge size={14} />
                  合并到已有
                </span>
              </Radio>
              <Radio value="new">
                <span className="flex items-center gap-1">
                  <PlusCircle size={14} />
                  新建投诉
                </span>
              </Radio>
            </Radio.Group>
            {record.duplicateAction === 'merge' && (
              <Select
                size="small"
                style={{ width: '100%' }}
                placeholder={record.duplicates.length === 1 ? '确认合并目标' : '请选择合并目标'}
                value={record.selectedMergeTargetId}
                onChange={(val) => handleMergeTargetChange(record.rowIndex, val)}
                status={record.mergeValidationError ? 'error' : undefined}
                options={record.duplicates.map(d => ({
                  label: `${d.complaint.id} - ${Math.round(d.similarity * 100)}% - ${d.complaint.title}`,
                  value: d.complaint.id,
                }))}
              />
            )}
            {record.duplicateAction === 'merge' && !record.selectedMergeTargetId && (
              <div className="text-xs text-orange-500 flex items-center gap-1">
                <AlertTriangle size={11} />
                请选择合并目标投诉
              </div>
            )}
            {record.mergeValidationError && (
              <div className="text-xs text-red-500 flex items-center gap-1">
                <XCircle size={11} />
                {record.mergeValidationError}
              </div>
            )}
          </div>
        );
      },
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
      title: '合并',
      dataIndex: 'mergedCount',
      width: 100,
      align: 'center',
      render: (count) =>
        count > 0 ? <Tag color="orange">{count} 条</Tag> : <Tag>0 条</Tag>,
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

        <div className="mt-4">
          <Divider plain>或者</Divider>
          <Button
            icon={<ClipboardPaste size={16} />}
            onClick={() => setPasteModalVisible(true)}
          >
            粘贴表格数据
          </Button>
        </div>

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
              <p>• 粘贴数据支持 Tab 或逗号分隔，第一行为表头</p>
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
            title="疑似重复"
            value={stats.hasDuplicates}
            prefix={<GitMerge size={18} className="text-orange-400" />}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                导入完成：成功 <span className="font-semibold text-green-600">{importResult.success}</span> 条，
                合并 <span className="font-semibold text-orange-500">{importResult.merged}</span> 条，
                失败 <span className="font-semibold text-red-500">{importResult.failed}</span> 条
              </span>
            </div>
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

  const StepProgressBar = () => (
    <Card className="mb-4">
      <Steps
        current={['upload', 'preview', 'duplicate', 'result'].indexOf(currentStep)}
        items={stepItems}
        size="small"
      />
    </Card>
  );

  const PreviewView = () => (
    <div className="space-y-4">
      <StatsSection />
      <AnalysisSection />

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
            <Tag color="success">正常: {stats.valid - stats.hasDuplicates} 条</Tag>
            <Tag color="orange">疑似重复: {stats.hasDuplicates} 条</Tag>
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
          scroll={{ x: 1600, y: 400 }}
          pagination={false}
          size="small"
          rowClassName={(record) =>
            record.importStatus === 'success'
              ? 'bg-green-50'
              : record.importStatus === 'merged'
              ? 'bg-orange-50'
              : record.importStatus === 'failed'
              ? 'bg-red-50'
              : record.errors.length > 0
              ? 'bg-red-50'
              : record.mergeValidationError
              ? 'bg-red-50'
              : record.hasDuplicates
              ? 'bg-orange-50'
              : record.warnings.length > 0
              ? 'bg-yellow-50'
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
                橙色行表示疑似重复，需确认合并或新建；
                <CheckSquare size={14} className="inline mx-1 text-yellow-500" />
                黄色行表示存在警告，但仍可导入。
              </>
            )}
          </div>
          <Space>
            <Button icon={<RotateCcw size={14} />} onClick={handleReset}>
              重新上传
            </Button>
            <Button
              type="primary"
              icon={<ChevronRight size={14} />}
              onClick={handleGoToDuplicateStep}
              disabled={stats.valid === 0 || importing}
            >
              下一步：处理重复投诉 ({stats.valid} 条有效)
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );

  const DuplicateView = () => {
    const duplicateCount = filteredDuplicateRows.filter(r => r.hasDuplicates).length;
    const nonDuplicateCount = filteredDuplicateRows.filter(r => !r.hasDuplicates).length;
    const mergeActionCount = filteredDuplicateRows.filter(
      r => r.hasDuplicates && r.duplicateAction === 'merge'
    ).length;
    const newActionCount = filteredDuplicateRows.filter(
      r => r.hasDuplicates && r.duplicateAction === 'new'
    ).length;

    const handleBatchSetAction = (action: DuplicateAction) => {
      setParsedData(prev => prev.map(row =>
        row.hasDuplicates && row.errors.length === 0
          ? { ...row, duplicateAction: action }
          : row
      ));
    };

    return (
      <div className="space-y-4">
        <Row gutter={[16, 16]} className="mb-4">
          <Col span={6}>
            <Card className="text-center">
              <Statistic
                title="有效记录"
                value={filteredDuplicateRows.length}
                prefix={<FileSpreadsheet size={18} className="text-gray-400" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="text-center">
              <Statistic
                title="疑似重复"
                value={duplicateCount}
                prefix={<GitMerge size={18} className="text-orange-400" />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="text-center">
              <Statistic
                title="将合并"
                value={mergeActionCount}
                prefix={<GitMerge size={18} className="text-purple-400" />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="text-center">
              <Statistic
                title="将新建"
                value={nonDuplicateCount + newActionCount}
                prefix={<PlusCircle size={18} className="text-green-400" />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-800">重复投诉处理</span>
              <span className="text-sm text-gray-400">
                共 {filteredDuplicateRows.length} 条有效记录
              </span>
              <Radio.Group
                size="small"
                value={duplicateFilter}
                onChange={(e) => setDuplicateFilter(e.target.value)}
                className="ml-4"
              >
                <Radio.Button value="all">全部</Radio.Button>
                <Radio.Button value="has">有重复</Radio.Button>
                <Radio.Button value="none">无重复</Radio.Button>
              </Radio.Group>
            </div>
            <Space size="small">
              <Button
                size="small"
                icon={<GitMerge size={14} />}
                onClick={() => handleBatchSetAction('merge')}
                disabled={duplicateCount === 0}
              >
                全部合并
              </Button>
              <Button
                size="small"
                icon={<PlusCircle size={14} />}
                onClick={() => handleBatchSetAction('new')}
                disabled={duplicateCount === 0}
              >
                全部新建
              </Button>
            </Space>
          </div>

          <Alert
            type="info"
            showIcon
            className="mb-4"
            message={
              <div className="text-sm">
                <strong>处理说明：</strong>
                橙色标记的记录检测到疑似重复投诉。您可以选择「合并到已有」将其标记为重复投诉并关联到目标投诉，
                或选择「新建投诉」作为独立投诉录入。无重复的记录将自动作为新投诉导入。
              </div>
            }
          />

          <Table
            rowKey="rowIndex"
            columns={duplicateColumns}
            dataSource={filteredDuplicateRows}
            scroll={{ x: 1200, y: 400 }}
            pagination={false}
            size="small"
            rowClassName={(record) =>
              record.hasDuplicates
                ? record.duplicateAction === 'merge'
                  ? 'bg-purple-50'
                  : 'bg-orange-50'
                : 'bg-green-50/50'
            }
          />

          <Divider />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <GitMerge size={14} className="inline mr-1 text-purple-500" />
              紫色行：将合并到已有投诉；
              <AlertTriangle size={14} className="inline mx-1 text-orange-500" />
              橙色行：疑似重复待处理；
              <CheckCircle size={14} className="inline mx-1 text-green-500" />
              绿色行：将作为新投诉导入
            </div>
            <Space>
              <Button icon={<ChevronRight size={14} className="rotate-180" />} onClick={handleBackToPreview}>
                返回数据校验
              </Button>
              <Button
                type="primary"
                icon={<Send size={14} />}
                onClick={handleImport}
                loading={importing}
                disabled={filteredDuplicateRows.length === 0}
              >
                确认批量导入 ({filteredDuplicateRows.length} 条)
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  };

  const ResultView = () => {
    if (!importResult) return null;

    const successRows = parsedData.filter(r => r.importStatus === 'success');
    const mergedRows = parsedData.filter(r => r.importStatus === 'merged');
    const failedRows = parsedData.filter(r => r.importStatus === 'failed');

    return (
      <div className="space-y-4">
        <Card>
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">批量导入完成</h2>
            <p className="text-gray-500 mb-6">
              共处理 {importResult.total} 条记录，
              成功 {importResult.success} 条，
              合并 {importResult.merged} 条，
              失败 {importResult.failed} 条
            </p>
            <Progress
              percent={Math.round(((importResult.success + importResult.merged) / importResult.total) * 100)}
              status={importResult.failed > 0 ? 'exception' : 'success'}
              className="max-w-md mx-auto"
            />
          </div>

          <Row gutter={[16, 16]} className="mt-4">
            <Col span={8}>
              <Card className="text-center !bg-green-50">
                <Statistic
                  title="导入成功"
                  value={importResult.success}
                  prefix={<CheckCircle size={20} className="text-green-500" />}
                  valueStyle={{ color: '#52c41a' }}
                  suffix="条"
                />
                {successRows.length > 0 && (
                  <div className="mt-3 text-left text-xs text-gray-500 max-h-24 overflow-auto">
                    {successRows.slice(0, 5).map(r => (
                      <div key={r.importedId} className="truncate">
                        <span className="text-blue-600 cursor-pointer hover:underline"
                          onClick={() => navigate(`/complaints/${r.importedId}`)}
                        >
                          {r.importedId}
                        </span>
                        {' - '}{r.title}
                      </div>
                    ))}
                    {successRows.length > 5 && (
                      <div className="text-gray-400">...等 {successRows.length} 条</div>
                    )}
                  </div>
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card className="text-center !bg-orange-50">
                <Statistic
                  title="合并重复"
                  value={importResult.merged}
                  prefix={<GitMerge size={20} className="text-orange-500" />}
                  valueStyle={{ color: '#fa8c16' }}
                  suffix="条"
                />
                {mergedRows.length > 0 && (
                  <div className="mt-3 text-left text-xs text-gray-500 max-h-24 overflow-auto">
                    {mergedRows.slice(0, 5).map(r => (
                      <div key={r.importedId} className="truncate">
                        <span className="text-blue-600">{r.importedId}</span>
                        {' → '}
                        <span className="text-purple-600 cursor-pointer hover:underline"
                          onClick={() => navigate(`/complaints/${r.mergedIntoId}`)}
                        >
                          {r.mergedIntoId}
                        </span>
                      </div>
                    ))}
                    {mergedRows.length > 5 && (
                      <div className="text-gray-400">...等 {mergedRows.length} 条</div>
                    )}
                  </div>
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card className="text-center !bg-red-50">
                <Statistic
                  title="导入失败"
                  value={importResult.failed}
                  prefix={<XCircle size={20} className="text-red-500" />}
                  valueStyle={{ color: '#ff4d4f' }}
                  suffix="条"
                />
                {failedRows.length > 0 && (
                  <div className="mt-3 text-left text-xs text-gray-500 max-h-24 overflow-auto">
                    {failedRows.slice(0, 5).map(r => (
                      <div key={r.rowIndex} className="truncate text-red-500">
                        第{r.rowIndex}行：{r.errors[0] || '未知错误'}
                      </div>
                    ))}
                    {failedRows.length > 5 && (
                      <div className="text-gray-400">...等 {failedRows.length} 条</div>
                    )}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Card>

        {showResultDetail && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-gray-800">导入结果明细</span>
              <Button type="link" size="small" onClick={() => setShowResultDetail(false)}>
                收起详情
              </Button>
            </div>
            <Table
              rowKey="rowIndex"
              columns={columns}
              dataSource={parsedData}
              scroll={{ x: 1600, y: 400 }}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              size="small"
              rowClassName={(record) =>
                record.importStatus === 'success'
                  ? 'bg-green-50'
                  : record.importStatus === 'merged'
                  ? 'bg-orange-50'
                  : record.importStatus === 'failed'
                  ? 'bg-red-50'
                  : ''
              }
            />
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              type="primary"
              icon={<ExternalLink size={16} />}
              size="large"
              onClick={handleGoToComplaints}
            >
              前往投诉列表查看
            </Button>
            <Button
              icon={<PlusCircle size={16} />}
              size="large"
              onClick={handleReset}
            >
              继续导入新数据
            </Button>
            {!showResultDetail && (
              <Button icon={<Eye size={16} />} size="large" onClick={handleViewImported}>
                查看导入详情
              </Button>
            )}
            {importResult.failed > 0 && (
              <Button icon={<FileDown size={16} />} size="large" onClick={handleExportErrors}>
                导出错误数据
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return <UploadSection />;
      case 'preview':
        return <PreviewView />;
      case 'duplicate':
        return <DuplicateView />;
      case 'result':
        return <ResultView />;
      default:
        return <UploadSection />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">批量导入投诉</h1>
          <p className="text-sm text-gray-500 mt-1">
            通过 Excel/CSV 文件或粘贴表格数据，批量导入投诉记录并完成校验、派单和重复检测
          </p>
        </div>
      </div>

      {importing && (
        <Card className="mb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">正在导入数据...</span>
                <span className="text-sm text-gray-500">{importProgress}%</span>
              </div>
              <Progress percent={importProgress} status="active" />
            </div>
          </div>
        </Card>
      )}

      {currentStep !== 'upload' && currentStep !== 'result' && <StepProgressBar />}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'import',
            label: (
              <span className="flex items-center gap-1.5">
                <UploadIcon size={16} />
                批量导入
              </span>
            ),
            children: renderStepContent(),
          },
          {
            key: 'history',
            label: (
              <span className="flex items-center gap-1.5">
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
                  scroll={{ x: 1300 }}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="粘贴表格数据"
        open={pasteModalVisible}
        onCancel={() => {
          setPasteModalVisible(false);
          setPasteText('');
        }}
        onOk={handlePasteConfirm}
        okText="解析数据"
        cancelText="取消"
        width={720}
      >
        <div className="space-y-3">
          <Alert
            type="info"
            showIcon
            message="支持 Tab 分隔（Excel 复制）或逗号分隔的 CSV 格式，第一行为表头"
          />
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>列顺序（从左到右）：</strong>投诉标题、投诉内容、事项分类、所属区域、联系人、联系电话、详细地址（可选）、责任单位（可选）</p>
            <p><strong>事项分类格式：</strong>大类 - 子类，如「城市管理 - 占道经营」</p>
          </div>
          <Input.TextArea
            rows={12}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`投诉标题\t投诉内容\t事项分类\t所属区域\t联系人\t联系电话\t详细地址\t责任单位
朝阳路占道经营严重\t朝阳路摊贩占道\t城市管理 - 占道经营\t朝阳区\t张三\t13800138001\t朝阳路路口\t城市管理委员会`}
            className="font-mono text-xs"
          />
        </div>
      </Modal>

      <Modal
        title={previewRecord ? `第 ${previewRecord.rowIndex} 行数据详情` : '数据详情'}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewRecord(null);
        }}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {previewRecord && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {previewRecord.errors.length > 0 ? (
                <Tag icon={<XCircle size={12} />} color="error">存在错误</Tag>
              ) : previewRecord.hasDuplicates ? (
                <Tag icon={<GitMerge size={12} />} color="orange">疑似重复</Tag>
              ) : previewRecord.warnings.length > 0 ? (
                <Tag icon={<AlertTriangle size={12} />} color="warning">存在警告</Tag>
              ) : (
                <Tag icon={<CheckCircle size={12} />} color="success">数据正常</Tag>
              )}
              {previewRecord.importStatus === 'success' && (
                <Tag color="success">已导入</Tag>
              )}
              {previewRecord.importStatus === 'merged' && (
                <Tag color="orange">已合并</Tag>
              )}
              {previewRecord.importStatus === 'failed' && (
                <Tag color="error">导入失败</Tag>
              )}
            </div>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="投诉标题" span={2}>
                {previewRecord.title || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
              <Descriptions.Item label="投诉内容" span={2}>
                {previewRecord.content || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
              <Descriptions.Item label="事项分类">
                {previewRecord.categoryName || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
              <Descriptions.Item label="所属区域">
                {previewRecord.areaName || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
              <Descriptions.Item label="责任单位" span={2}>
                {previewRecord.departmentName || <span className="text-gray-400">系统自动派单</span>}
              </Descriptions.Item>
              <Descriptions.Item label="派单规则" span={2}>
                {(() => {
                  const hits = previewRecord.dispatchRuleHits || [];
                  if (hits.length === 0) {
                    return (
                      <span className="text-gray-400 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        未匹配到派单规则，将使用默认责任单位
                      </span>
                    );
                  }
                  const levelColor: Record<string, string> = {
                    exact: 'green',
                    category_match: 'blue',
                    area_match: 'cyan',
                  };
                  return (
                    <div className="space-y-2">
                      {hits.map((hit, idx) => (
                        <div
                          key={hit.rule.id}
                          className={`p-2 rounded border ${
                            idx === 0
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {idx === 0 ? (
                                <Tag color="green" icon={<CheckCircle size={10} />}>将采用</Tag>
                              ) : (
                                <Tag color="default">备选</Tag>
                              )}
                              <Tag color={levelColor[hit.matchLevel]}>{hit.matchLevelText}</Tag>
                              <span className="text-sm font-medium">{hit.rule.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{hit.rule.id}</span>
                            </div>
                            <span className="text-xs text-gray-400">优先级: {hit.rule.priority}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-4 flex-wrap">
                            <span><strong>条件：</strong>{hit.rule.categoryName} / {hit.rule.areaName}</span>
                            <span><strong>派单至：</strong>{hit.rule.departmentName}</span>
                          </div>
                          {hit.rule.description && (
                            <div className="text-xs text-gray-400 mt-0.5">{hit.rule.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="联系人">
                {previewRecord.contactName || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {previewRecord.contactPhone || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
              <Descriptions.Item label="详细地址" span={2}>
                {previewRecord.address || <span className="text-gray-400">（空）</span>}
              </Descriptions.Item>
            </Descriptions>

            {previewRecord.errors.length > 0 && (
              <Alert
                type="error"
                showIcon
                message={<strong>校验错误 ({previewRecord.errors.length} 项)</strong>}
                description={
                  <ul className="list-disc list-inside space-y-0.5">
                    {previewRecord.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {previewRecord.warnings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={<strong>数据警告 ({previewRecord.warnings.length} 项)</strong>}
                description={
                  <ul className="list-disc list-inside space-y-0.5">
                    {previewRecord.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {previewRecord.hasDuplicates && previewRecord.duplicates && previewRecord.duplicates.length > 0 && (
              <div>
                <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <GitMerge size={16} className="text-orange-500" />
                  疑似重复投诉 ({previewRecord.duplicates.length} 条)
                </div>
                <div className="space-y-2">
                  {previewRecord.duplicates.map((dup) => (
                    <div
                      key={dup.complaint.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                      onClick={() => navigate(`/complaints/${dup.complaint.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-sm text-blue-600 hover:underline">
                          {dup.complaint.id}
                        </span>
                        <Tag color={getSimilarityColor(dup.similarity).replace('#', '')}>
                          {getSimilarityLabel(dup.similarity)} {Math.round(dup.similarity * 100)}%
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-800">{dup.complaint.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {dup.matchReasons.join('、')} · {dup.complaint.areaName} · {dup.complaint.departmentName}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        提交时间：{dup.complaint.createdAt} · 状态：<StatusTag status={dup.complaint.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewRecord.importedId && (
              <Alert
                type="success"
                showIcon
                message={
                  <span>
                    导入结果：
                    {previewRecord.importStatus === 'success' && '已成功创建投诉 '}
                    {previewRecord.importStatus === 'merged' && '已合并为重复投诉 '}
                    <span
                      className="text-blue-600 cursor-pointer hover:underline font-medium"
                      onClick={() => navigate(`/complaints/${previewRecord.importedId}`)}
                    >
                      {previewRecord.importedId}
                    </span>
                    {previewRecord.mergedIntoId && (
                      <span>
                        {' → '}合并至
                        <span
                          className="text-purple-600 cursor-pointer hover:underline font-medium ml-1"
                          onClick={() => navigate(`/complaints/${previewRecord.mergedIntoId}`)}
                        >
                          {previewRecord.mergedIntoId}
                        </span>
                      </span>
                    )}
                  </span>
                }
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BatchImport;