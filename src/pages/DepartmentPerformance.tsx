import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Progress,
  Select,
  DatePicker,
  Drawer,
  Table,
  Rate,
  Tabs,
  Badge,
  Empty,
  Tooltip,
  Divider,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  AlertTriangle,
  Trophy,
  Clock,
  ThumbsUp,
  RotateCcw,
  Star,
  Bell,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  Eye,
  PieChart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { departments, departmentTypes, statusMap, statusColorMap } from '@/data/dictionaries';
import { StatusTag, SourceTag, SatisfactionTag } from '@/components/StatusTags';
import type { Complaint, PerformanceDrillDownType } from '@/types';

const { RangePicker } = DatePicker;

interface DeptPerformance {
  departmentId: string;
  departmentName: string;
  departmentType: string;
  totalCount: number;
  completedCount: number;
  onTimeCount: number;
  onTimeRate: number;
  avgDuration: number;
  overdueCount: number;
  returnCount: number;
  returnRate: number;
  satisfaction: number;
  lowSatisfactionCount: number;
  urgeCount: number;
  avgUrgePerComplaint: number;
  statusDistribution: Record<string, number>;
}

const drillTypeLabelMap: Record<PerformanceDrillDownType, string> = {
  overdue: '超期工单',
  return: '退回工单',
  urge: '催办工单',
  low_satisfaction: '满意度偏低',
};

const rankMetricDrillMap: Partial<Record<string, PerformanceDrillDownType>> = {
  overdueCount: 'overdue',
  returnCount: 'return',
  urgeCount: 'urge',
  lowSatisfactionCount: 'low_satisfaction',
};

const DepartmentPerformance: React.FC = () => {
  const navigate = useNavigate();
  const { complaints } = useAppStore();
  const [selectedDept, setSelectedDept] = useState<DeptPerformance | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [deptTypeFilter, setDeptTypeFilter] = useState<string>('all');
  const [rankMetric, setRankMetric] = useState<string>('totalCount');
  const [activeDetailTab, setActiveDetailTab] = useState<string>('overview');

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const created = dayjs(c.createdAt);
      return created.isAfter(dateRange[0]) && created.isBefore(dateRange[1]);
    });
  }, [complaints, dateRange]);

  const deptPerformanceData = useMemo((): DeptPerformance[] => {
    const deptMap = new Map<string, DeptPerformance>();

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentType: dept.type,
        totalCount: 0,
        completedCount: 0,
        onTimeCount: 0,
        onTimeRate: 0,
        avgDuration: 0,
        overdueCount: 0,
        returnCount: 0,
        returnRate: 0,
        satisfaction: 0,
        lowSatisfactionCount: 0,
        urgeCount: 0,
        avgUrgePerComplaint: 0,
        statusDistribution: {},
      });
    });

    filteredComplaints.forEach((c) => {
      const dept = deptMap.get(c.departmentId);
      if (!dept) return;

      dept.totalCount++;
      dept.urgeCount += c.urgeCount || 0;
      dept.statusDistribution[c.status] = (dept.statusDistribution[c.status] || 0) + 1;

      const isOverdue = c.status === 'overdue' || (c.status !== 'completed' && dayjs().isAfter(dayjs(c.deadline)));
      if (isOverdue) {
        dept.overdueCount++;
      }

      if (c.status === 'completed' && c.finishedAt) {
        dept.completedCount++;
        const duration = dayjs(c.finishedAt).diff(dayjs(c.createdAt), 'day', true);
        dept.avgDuration += duration;

        const finishedOnTime = dayjs(c.finishedAt).isBefore(dayjs(c.deadline));
        if (finishedOnTime) {
          dept.onTimeCount++;
        }

        if (c.satisfaction) {
          dept.satisfaction += c.satisfaction;
        }
      }

      if (c.satisfaction && c.satisfaction < 3.5) {
        dept.lowSatisfactionCount++;
      }

      const hasReturn = c.timelines.some((t) => t.type === 'return');
      if (hasReturn) {
        dept.returnCount++;
      }
    });

    return Array.from(deptMap.values())
      .filter((d) => deptTypeFilter === 'all' || d.departmentType === deptTypeFilter)
      .map((d) => {
        const completed = d.completedCount;
        const hasCompleted = completed > 0;
        return {
          ...d,
          onTimeRate: hasCompleted ? Number(((d.onTimeCount / completed) * 100).toFixed(1)) : 0,
          avgDuration: hasCompleted ? Number((d.avgDuration / completed).toFixed(1)) : 0,
          returnRate: d.totalCount > 0 ? Number(((d.returnCount / d.totalCount) * 100).toFixed(1)) : 0,
          satisfaction: hasCompleted ? Number((d.satisfaction / completed).toFixed(1)) : 0,
          avgUrgePerComplaint: d.totalCount > 0 ? Number((d.urgeCount / d.totalCount).toFixed(2)) : 0,
        };
      });
  }, [filteredComplaints, deptTypeFilter]);

  const sortedDeptData = useMemo(() => {
    return [...deptPerformanceData].sort((a, b) => {
      switch (rankMetric) {
        case 'totalCount':
          return b.totalCount - a.totalCount;
        case 'onTimeRate':
          return b.onTimeRate - a.onTimeRate;
        case 'avgDuration':
          return a.avgDuration - b.avgDuration;
        case 'returnRate':
          return b.returnRate - a.returnRate;
        case 'returnCount':
          return b.returnCount - a.returnCount;
        case 'satisfaction':
          return b.satisfaction - a.satisfaction;
        case 'overdueCount':
          return b.overdueCount - a.overdueCount;
        case 'lowSatisfactionCount':
          return b.lowSatisfactionCount - a.lowSatisfactionCount;
        case 'urgeCount':
          return b.urgeCount - a.urgeCount;
        default:
          return b.totalCount - a.totalCount;
      }
    });
  }, [deptPerformanceData, rankMetric]);

  const overallStats = useMemo(() => {
    const activeDepts = deptPerformanceData.filter((d) => d.totalCount > 0);
    const totalDepts = activeDepts.length;
    const completedDepts = activeDepts.filter((d) => d.completedCount > 0);

    const avgOnTimeRate =
      completedDepts.length > 0
        ? Number(
            (completedDepts.reduce((sum, d) => sum + d.onTimeRate, 0) / completedDepts.length).toFixed(1)
          )
        : 0;
    const avgSatisfaction =
      completedDepts.length > 0
        ? Number(
            (completedDepts.reduce((sum, d) => sum + d.satisfaction, 0) / completedDepts.length).toFixed(1)
          )
        : 0;
    const totalUrgeCount = deptPerformanceData.reduce((sum, d) => sum + d.urgeCount, 0);
    const totalReturnCount = deptPerformanceData.reduce((sum, d) => sum + d.returnCount, 0);
    const totalOverdueCount = deptPerformanceData.reduce((sum, d) => sum + d.overdueCount, 0);
    const totalLowSatisfactionCount = deptPerformanceData.reduce((sum, d) => sum + d.lowSatisfactionCount, 0);

    return {
      totalDepts,
      avgOnTimeRate,
      avgSatisfaction,
      totalUrgeCount,
      totalReturnCount,
      totalOverdueCount,
      totalLowSatisfactionCount,
    };
  }, [deptPerformanceData]);

  const trendData = useMemo(() => {
    const days = 14;
    const result: { date: string; onTimeRate: number; returnRate: number; satisfaction: number; complaintCount: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = dayjs().subtract(i, 'day').startOf('day');
      const dayEnd = dayjs().subtract(i, 'day').endOf('day');
      const dateStr = dayjs().subtract(i, 'day').format('MM-DD');

      const dayComplaints = filteredComplaints.filter((c) =>
        dayjs(c.createdAt).isBetween(dayStart, dayEnd)
      );

      const completed = dayComplaints.filter(
        (c) => c.status === 'completed' && c.finishedAt
      );
      const onTime = completed.filter((c) => dayjs(c.finishedAt!).isBefore(dayjs(c.deadline)));
      const returned = dayComplaints.filter((c) =>
        c.timelines.some((t) => t.type === 'return')
      );
      const satSum = completed.reduce((sum, c) => sum + (c.satisfaction || 0), 0);

      result.push({
        date: dateStr,
        onTimeRate: completed.length > 0 ? Number(((onTime.length / completed.length) * 100).toFixed(1)) : 0,
        returnRate: dayComplaints.length > 0 ? Number(((returned.length / dayComplaints.length) * 100).toFixed(1)) : 0,
        satisfaction: completed.length > 0 ? Number((satSum / completed.length).toFixed(1)) : 0,
        complaintCount: dayComplaints.length,
      });
    }

    return result;
  }, [filteredComplaints]);

  const deptTrendData = useMemo(() => {
    if (!selectedDept) return [];
    const days = 14;
    const result: { date: string; count: number; completed: number; onTimeRate: number }[] = [];
    const deptComplaints = filteredComplaints.filter(
      (c) => c.departmentId === selectedDept.departmentId
    );

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = dayjs().subtract(i, 'day').startOf('day');
      const dayEnd = dayjs().subtract(i, 'day').endOf('day');
      const dateStr = dayjs().subtract(i, 'day').format('MM-DD');

      const dayComplaints = deptComplaints.filter((c) =>
        dayjs(c.createdAt).isBetween(dayStart, dayEnd)
      );

      const completed = dayComplaints.filter(
        (c) => c.status === 'completed' && c.finishedAt
      );
      const onTime = completed.filter((c) => dayjs(c.finishedAt!).isBefore(dayjs(c.deadline)));

      result.push({
        date: dateStr,
        count: dayComplaints.length,
        completed: completed.length,
        onTimeRate: completed.length > 0 ? Number(((onTime.length / completed.length) * 100).toFixed(1)) : 0,
      });
    }

    return result;
  }, [selectedDept, filteredComplaints]);

  const trendOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['按期办结率', '退回率', '满意度', '投诉量'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => d.date),
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#999' },
    },
    yAxis: [
      {
        type: 'value',
        name: '比率(%)',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#f5f5f5' } },
        axisLabel: { color: '#999', formatter: '{value}%' },
      },
      {
        type: 'value',
        name: '满意度/数量',
        min: 0,
        splitLine: { show: false },
        axisLabel: { color: '#999' },
      },
    ],
    series: [
      {
        name: '按期办结率',
        type: 'line',
        data: trendData.map((d) => d.onTimeRate),
        smooth: true,
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.05)' },
            ],
          },
        },
        lineStyle: { width: 2 },
      },
      {
        name: '退回率',
        type: 'line',
        data: trendData.map((d) => d.returnRate),
        smooth: true,
        itemStyle: { color: '#fa8c16' },
        lineStyle: { width: 2, type: 'dashed' },
      },
      {
        name: '满意度',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map((d) => d.satisfaction),
        smooth: true,
        itemStyle: { color: '#faad14' },
        lineStyle: { width: 2 },
      },
      {
        name: '投诉量',
        type: 'bar',
        yAxisIndex: 1,
        data: trendData.map((d) => d.complaintCount),
        itemStyle: {
          color: 'rgba(24, 144, 255, 0.2)',
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '30%',
      },
    ],
  };

  const deptTrendOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['投诉量', '办结量'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: deptTrendData.map((d) => d.date),
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'value',
      name: '件数',
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#999' },
    },
    series: [
      {
        name: '投诉量',
        type: 'bar',
        data: deptTrendData.map((d) => d.count),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#69c0ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '35%',
      },
      {
        name: '办结量',
        type: 'bar',
        data: deptTrendData.map((d) => d.completed),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#52c41a' },
              { offset: 1, color: '#95de64' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '35%',
      },
    ],
  };

  const complaintDistributionOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}件 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'center',
      type: 'scroll',
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: sortedDeptData
          .filter((d) => d.totalCount > 0)
          .slice(0, 10)
          .map((d, index) => ({
            value: d.totalCount,
            name: d.departmentName,
            itemStyle: {
              color: [
                '#1890ff',
                '#52c41a',
                '#faad14',
                '#f5222d',
                '#722ed1',
                '#13c2c2',
                '#eb2f96',
                '#fa8c16',
                '#2f54eb',
                '#a0d911',
              ][index % 10],
            },
          })),
      },
    ],
  };

  const handleDeptClick = (dept: DeptPerformance) => {
    setSelectedDept(dept);
    setDrawerOpen(true);
    setActiveDetailTab('overview');
  };

  const handleDrillDown = (type: PerformanceDrillDownType, dept?: DeptPerformance) => {
    const params = new URLSearchParams({
      from: 'department-performance',
      drillType: type,
    });
    if (dept) {
      params.set('departmentId', dept.departmentId);
      params.set('departmentName', dept.departmentName);
    }
    navigate(`/complaints?${params.toString()}`);
  };

  const renderDrillCard = (
    type: PerformanceDrillDownType,
    value: number,
    suffix: string,
    prefix: React.ReactNode,
    color: string,
    dept?: DeptPerformance
  ) => (
    <Tooltip title={`查看${dept ? dept.departmentName : '全部责任单位'}${drillTypeLabelMap[type]}`}>
      <Card
        className="shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
        onClick={() => handleDrillDown(type, dept)}
      >
        <Statistic
          title={drillTypeLabelMap[type]}
          value={value}
          suffix={suffix}
          prefix={prefix}
          valueStyle={{ color }}
        />
        <div className="mt-2 text-xs text-blue-500">点击查看明细</div>
      </Card>
    </Tooltip>
  );

  const deptComplaints = useMemo(() => {
    if (!selectedDept) return [];
    return filteredComplaints.filter((c) => c.departmentId === selectedDept.departmentId);
  }, [selectedDept, filteredComplaints]);

  const rankMetricOptions = [
    { value: 'totalCount', label: '投诉量' },
    { value: 'onTimeRate', label: '按期办结率' },
    { value: 'avgDuration', label: '平均办理时长' },
    { value: 'overdueCount', label: '超期数' },
    { value: 'returnCount', label: '退回数' },
    { value: 'returnRate', label: '退回率' },
    { value: 'satisfaction', label: '满意度' },
    { value: 'lowSatisfactionCount', label: '满意度偏低' },
    { value: 'urgeCount', label: '催办次数' },
  ];

  const getRankBadgeStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    if (index === 1) return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    if (index === 2) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    return 'bg-gray-100 text-gray-500';
  };

  const getMetricColor = (metric: string, value: number) => {
    switch (metric) {
      case 'onTimeRate':
        return value >= 90 ? 'text-green-600' : value >= 75 ? 'text-yellow-600' : 'text-red-600';
      case 'returnRate':
        return value <= 5 ? 'text-green-600' : value <= 15 ? 'text-yellow-600' : 'text-red-600';
      case 'satisfaction':
        return value >= 4.5 ? 'text-green-600' : value >= 3.5 ? 'text-yellow-600' : 'text-red-600';
      case 'overdueCount':
      case 'returnCount':
      case 'lowSatisfactionCount':
      case 'urgeCount':
        return value === 0 ? 'text-green-600' : value <= 3 ? 'text-yellow-600' : 'text-red-600';
      case 'avgDuration':
        return value <= 3 ? 'text-green-600' : value <= 5 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getProgressPercent = (item: DeptPerformance, metric: string) => {
    const sorted = [...deptPerformanceData].filter((d) => d.totalCount > 0);
    if (sorted.length === 0) return 0;

    switch (metric) {
      case 'totalCount': {
        const max = Math.max(...sorted.map((d) => d.totalCount));
        return max > 0 ? (item.totalCount / max) * 100 : 0;
      }
      case 'onTimeRate': {
        const max = Math.max(...sorted.map((d) => d.onTimeRate));
        return max > 0 ? (item.onTimeRate / max) * 100 : 0;
      }
      case 'avgDuration': {
        const max = Math.max(...sorted.map((d) => d.avgDuration));
        const min = Math.min(...sorted.filter((d) => d.avgDuration > 0).map((d) => d.avgDuration));
        if (max === 0 || item.avgDuration === 0) return 0;
        return 100 - ((item.avgDuration - min) / (max - min || 1)) * 100;
      }
      case 'returnRate': {
        const max = Math.max(...sorted.map((d) => d.returnRate));
        return max > 0 ? (item.returnRate / max) * 100 : 0;
      }
      case 'overdueCount': {
        const max = Math.max(...sorted.map((d) => d.overdueCount));
        return max > 0 ? (item.overdueCount / max) * 100 : 0;
      }
      case 'returnCount': {
        const max = Math.max(...sorted.map((d) => d.returnCount));
        return max > 0 ? (item.returnCount / max) * 100 : 0;
      }
      case 'satisfaction': {
        const max = Math.max(...sorted.map((d) => d.satisfaction));
        return max > 0 ? (item.satisfaction / max) * 100 : 0;
      }
      case 'lowSatisfactionCount': {
        const max = Math.max(...sorted.map((d) => d.lowSatisfactionCount));
        return max > 0 ? (item.lowSatisfactionCount / max) * 100 : 0;
      }
      case 'urgeCount': {
        const max = Math.max(...sorted.map((d) => d.urgeCount));
        return max > 0 ? (item.urgeCount / max) * 100 : 0;
      }
      default:
        return 0;
    }
  };

  const getMetricValue = (item: DeptPerformance, metric: string) => {
    switch (metric) {
      case 'totalCount':
        return `${item.totalCount} 件`;
      case 'onTimeRate':
        return `${item.onTimeRate}%`;
      case 'avgDuration':
        return `${item.avgDuration} 天`;
      case 'overdueCount':
        return `${item.overdueCount} 件`;
      case 'returnCount':
        return `${item.returnCount} 件`;
      case 'returnRate':
        return `${item.returnRate}%`;
      case 'satisfaction':
        return `${item.satisfaction} 分`;
      case 'lowSatisfactionCount':
        return `${item.lowSatisfactionCount} 件`;
      case 'urgeCount':
        return `${item.urgeCount} 次`;
      default:
        return '';
    }
  };

  const complaintColumns = [
    {
      title: '投诉编号',
      dataIndex: 'id',
      key: 'id',
      width: 110,
      render: (text: string) => <span className="text-blue-600 font-mono">{text}</span>,
    },
    {
      title: '投诉标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: Complaint['status']) => <StatusTag status={status} />,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (source: Complaint['source']) => <SourceTag source={source} />,
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '区域',
      dataIndex: 'areaName',
      key: 'areaName',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
    },
    {
      title: '办理时长',
      key: 'duration',
      width: 100,
      render: (_: unknown, record: Complaint) => {
        if (record.status === 'completed' && record.finishedAt) {
          const days = dayjs(record.finishedAt).diff(dayjs(record.createdAt), 'day', true);
          return <span className="text-green-600">{days.toFixed(1)}天</span>;
        }
        const days = dayjs().diff(dayjs(record.createdAt), 'day', true);
        return <span className="text-orange-600">{days.toFixed(1)}天</span>;
      },
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction',
      key: 'satisfaction',
      width: 100,
      render: (score?: number) => <SatisfactionTag score={score} />,
    },
    {
      title: '催办次数',
      dataIndex: 'urgeCount',
      key: 'urgeCount',
      width: 90,
      render: (count?: number) => (
        <Badge count={count || 0} showZero color={count && count > 0 ? '#fa8c16' : '#d9d9d9'} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, record: Complaint) => (
        <Tooltip title="查看详情">
          <button
            className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
            onClick={() => navigate(`/complaints/${record.id}`)}
          >
            <Eye size={14} />
            <span className="text-sm">详情</span>
          </button>
        </Tooltip>
      ),
    },
  ];

  const statusDistributionList = useMemo(() => {
    if (!selectedDept) return [];
    const statuses = Object.entries(selectedDept.statusDistribution).map(([status, count]) => ({
      status,
      count,
      name: statusMap[status] || status,
    }));
    return statuses.sort((a, b) => b.count - a.count);
  }, [selectedDept]);

  const deptSatisfactionDist = useMemo(() => {
    if (!selectedDept) return [0, 0, 0, 0, 0];
    const dist = [0, 0, 0, 0, 0];
    const completed = deptComplaints.filter(
      (c) => c.status === 'completed' && c.satisfaction
    );
    completed.forEach((c) => {
      if (c.satisfaction && c.satisfaction >= 1 && c.satisfaction <= 5) {
        dist[c.satisfaction - 1]++;
      }
    });
    return dist;
  }, [selectedDept, deptComplaints]);

  const detailTabItems = [
    {
      key: 'overview',
      label: '绩效概览',
      children: selectedDept ? (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={12} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="投诉总量"
                  value={selectedDept.totalCount}
                  suffix="件"
                  prefix={<BarChart3 size={20} className="text-blue-500" />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="已办结"
                  value={selectedDept.completedCount}
                  suffix="件"
                  prefix={<ThumbsUp size={20} className="text-green-500" />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="按期办结率"
                  value={selectedDept.onTimeRate}
                  suffix="%"
                  prefix={<Clock size={20} className="text-green-500" />}
                  valueStyle={{
                    color:
                      selectedDept.onTimeRate >= 90
                        ? '#52c41a'
                        : selectedDept.onTimeRate >= 75
                        ? '#faad14'
                        : '#f5222d',
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="平均办理时长"
                  value={selectedDept.avgDuration}
                  suffix="天"
                  prefix={<Clock size={20} className="text-cyan-500" />}
                  valueStyle={{ color: '#13c2c2' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              {renderDrillCard(
                'overdue',
                selectedDept.overdueCount,
                '件',
                <AlertTriangle size={20} className="text-red-500" />,
                '#f5222d',
                selectedDept
              )}
            </Col>
            <Col xs={12} md={8}>
              {renderDrillCard(
                'return',
                selectedDept.returnCount,
                '件',
                <RotateCcw size={20} className="text-orange-500" />,
                '#fa8c16',
                selectedDept
              )}
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="状态分布" className="shadow-sm">
                <List
                  dataSource={statusDistributionList}
                  renderItem={(item) => (
                    <List.Item className="px-0 py-2">
                      <div className="w-full">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-sm font-medium text-gray-600">{item.count}件</span>
                        </div>
                        <Progress
                          percent={(item.count / selectedDept.totalCount) * 100}
                          size="small"
                          strokeColor={statusColorMap[item.status] || '#1890ff'}
                          showInfo={false}
                        />
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="部门信息" className="shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Building2 size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 w-20">部门类型：</span>
                    <Tag color="blue">{selectedDept.departmentType}</Tag>
                  </div>
                  <div className="flex items-center">
                    <Bell size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 w-20">催办总次数：</span>
                    <button
                      type="button"
                      className="font-semibold text-orange-600 hover:text-orange-700"
                      onClick={() => handleDrillDown('urge', selectedDept)}
                    >
                      {selectedDept.urgeCount} 次
                    </button>
                  </div>
                  <div className="flex items-center">
                    <RotateCcw size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 w-20">退回总件数：</span>
                    <button
                      type="button"
                      className="font-semibold text-red-600 hover:text-red-700"
                      onClick={() => handleDrillDown('return', selectedDept)}
                    >
                      {selectedDept.returnCount} 件
                    </button>
                  </div>
                  <div className="flex items-center">
                    <AlertTriangle size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 w-20">超期工单：</span>
                    <button
                      type="button"
                      className="font-semibold text-red-600 hover:text-red-700"
                      onClick={() => handleDrillDown('overdue', selectedDept)}
                    >
                      {selectedDept.overdueCount} 件
                    </button>
                  </div>
                  <div className="flex items-center">
                    <Star size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 w-20">满意偏低：</span>
                    <button
                      type="button"
                      className="font-semibold text-orange-600 hover:text-orange-700"
                      onClick={() => handleDrillDown('low_satisfaction', selectedDept)}
                    >
                      {selectedDept.lowSatisfactionCount} 件
                    </button>
                  </div>
                  <div className="flex items-center">
                    <BarChart3 size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 w-20">平均每件催办：</span>
                    <span className="font-semibold">{selectedDept.avgUrgePerComplaint} 次</span>
                  </div>
                </div>
                <Divider className="my-4" />
                <div className="text-sm text-gray-500">
                  <p className="mb-2">满意度分布：</p>
                  <div className="flex items-center justify-between">
                    {['1星', '2星', '3星', '4星', '5星'].map((star, index) => (
                      <div key={star} className="text-center">
                        <div className="text-xs text-gray-400 mb-1">{star}</div>
                        <div className="text-sm font-semibold" style={{ color: ['#f5222d', '#fa8c16', '#faad14', '#52c41a', '#13c2c2'][index] }}>
                          {deptSatisfactionDist[index]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <span className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500" />
                投诉量趋势（近14天）
              </span>
            }
            className="shadow-sm"
          >
            <ReactECharts option={deptTrendOption} style={{ height: 280 }} />
          </Card>
        </div>
      ) : null,
    },
    {
      key: 'complaints',
      label: `投诉明细 (${deptComplaints.length})`,
      children: (
        <Table
          dataSource={deptComplaints}
          columns={complaintColumns}
          rowKey="id"
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: <Empty description="暂无投诉数据" /> }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-gray-600">统计周期：</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ width: 280 }}
          />
          <span className="text-gray-600">部门类型：</span>
          <Select
            value={deptTypeFilter}
            onChange={setDeptTypeFilter}
            style={{ width: 140 }}
            options={departmentTypes.map((t) => ({ value: t === '全部' ? 'all' : t, label: t }))}
          />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card className="shadow-sm">
            <Statistic
              title="参评部门数"
              value={overallStats.totalDepts}
              suffix="个"
              prefix={<Building2 size={20} className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="shadow-sm">
            <Statistic
              title="平均按期办结率"
              value={overallStats.avgOnTimeRate}
              suffix="%"
              prefix={<Clock size={20} className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="mt-2 flex items-center gap-1 text-sm text-green-500">
              <TrendingUp size={14} />
              <span>较上月提升 3.2%</span>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="shadow-sm">
            <Statistic
              title="平均满意度"
              value={overallStats.avgSatisfaction}
              suffix="分"
              prefix={<Star size={20} className="text-yellow-500" />}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="mt-1">
              <Rate disabled defaultValue={overallStats.avgSatisfaction} style={{ fontSize: 14 }} />
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="shadow-sm">
            <Statistic
              title="总催办次数"
              value={overallStats.totalUrgeCount}
              suffix="次"
              prefix={<Bell size={20} className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="mt-2 flex items-center gap-1 text-sm text-green-500">
              <TrendingDown size={14} />
              <span>较上月下降 12.5%</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          {renderDrillCard(
            'overdue',
            overallStats.totalOverdueCount,
            '件',
            <AlertTriangle size={20} className="text-red-500" />,
            '#f5222d'
          )}
        </Col>
        <Col xs={12} md={6}>
          {renderDrillCard(
            'return',
            overallStats.totalReturnCount,
            '件',
            <RotateCcw size={20} className="text-orange-500" />,
            '#fa8c16'
          )}
        </Col>
        <Col xs={12} md={6}>
          {renderDrillCard(
            'urge',
            overallStats.totalUrgeCount,
            '次',
            <Bell size={20} className="text-yellow-500" />,
            '#faad14'
          )}
        </Col>
        <Col xs={12} md={6}>
          {renderDrillCard(
            'low_satisfaction',
            overallStats.totalLowSatisfactionCount,
            '件',
            <Star size={20} className="text-orange-500" />,
            '#fa8c16'
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Trophy size={18} className="text-yellow-500" />
                部门绩效排行榜
              </span>
            }
            className="shadow-sm"
            extra={
              <Select
                value={rankMetric}
                onChange={setRankMetric}
                style={{ width: 140 }}
                options={rankMetricOptions}
              />
            }
          >
            <List
              dataSource={sortedDeptData.filter((d) => d.totalCount > 0).slice(0, 10)}
              renderItem={(item, index) => {
                const drillType = rankMetricDrillMap[rankMetric];
                const metricClassName = `font-semibold w-20 text-right flex-shrink-0 ${getMetricColor(rankMetric, item[rankMetric as keyof DeptPerformance] as number)}`;

                return (
                  <List.Item
                    className="px-0 py-3 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                    onClick={() => handleDeptClick(item)}
                  >
                    <div className="flex items-center w-full">
                      <span
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${getRankBadgeStyle(index)}`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 text-gray-700 font-medium truncate mr-2">
                        {item.departmentName}
                      </span>
                      <Tag className="mr-3 flex-shrink-0">{item.departmentType}</Tag>
                      <div className="w-24 mr-4 flex-shrink-0">
                        <Progress
                          percent={getProgressPercent(item, rankMetric)}
                          size="small"
                          strokeColor={
                            rankMetricDrillMap[rankMetric] || rankMetric === 'returnRate' || rankMetric === 'avgDuration'
                              ? '#fa8c16'
                              : '#52c41a'
                          }
                          showInfo={false}
                        />
                      </div>
                      {drillType ? (
                        <button
                          type="button"
                          className={`${metricClassName} hover:underline`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDrillDown(drillType, item);
                          }}
                        >
                          {getMetricValue(item, rankMetric)}
                        </button>
                      ) : (
                        <span className={metricClassName}>
                          {getMetricValue(item, rankMetric)}
                        </span>
                      )}
                    </div>
                  </List.Item>
                );
              }}
            />
            {sortedDeptData.filter((d) => d.totalCount > 0).length === 0 && (
              <Empty description="暂无数据" className="py-8" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <PieChart size={18} className="text-blue-500" />
                投诉量分布
              </span>
            }
            className="shadow-sm"
          >
            <ReactECharts option={complaintDistributionOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span className="flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            绩效趋势（近14天）
          </span>
        }
        className="shadow-sm"
      >
        <ReactECharts option={trendOption} style={{ height: 340 }} />
      </Card>

      <Drawer
        title={
          <div className="flex items-center gap-3">
            <Building2 size={22} className="text-blue-500" />
            <span className="text-lg font-semibold">{selectedDept?.departmentName}</span>
            <Tag color="blue">{selectedDept?.departmentType}</Tag>
          </div>
        }
        width={960}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Tabs activeKey={activeDetailTab} onChange={setActiveDetailTab} items={detailTabItems} />
      </Drawer>
    </div>
  );
};

export default DepartmentPerformance;
