import { Card, Row, Col, List, Tag, Button } from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  Timer,
  TrendingUp,
  MapPin,
  Repeat,
  Bell,
  Clock4,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { areas } from '@/data/dictionaries';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardStats, complaints, extensionRequests } = useAppStore();

  if (!dashboardStats) return null;

  const expiringCount = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    const daysLeft = dayjs(c.deadline).diff(dayjs(), 'day');
    return daysLeft >= 0 && daysLeft <= 2;
  }).length;

  const overdueCount = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    return dayjs().isAfter(dayjs(c.deadline));
  }).length;

  const multiUrgeCount = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    return (c.urgeCount || 0) >= 2;
  }).length;

  const delayPendingCount = extensionRequests.filter(
    (r) => r.status === 'pending'
  ).length;

  const highRiskCount = complaints.filter((c) => {
    if (c.status === 'completed') return false;
    const isOverdue = dayjs().isAfter(dayjs(c.deadline));
    const urgeCount = c.urgeCount || 0;
    return isOverdue || urgeCount >= 3;
  }).length;

  const statCards = [
    {
      title: '投诉总量',
      value: dashboardStats.totalCount,
      icon: <FileText size={24} />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: '办理中',
      value: dashboardStats.processingCount,
      icon: <Clock size={24} />,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      trend: '+5%',
      trendUp: true,
      linkTo: '/warning-center?tab=expiring',
    },
    {
      title: '已办结',
      value: dashboardStats.completedCount,
      icon: <CheckCircle2 size={24} />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      trend: '+18%',
      trendUp: true,
    },
    {
      title: '超期数量',
      value: dashboardStats.overdueCount,
      icon: <AlertTriangle size={24} />,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      trend: '-8%',
      trendUp: false,
      linkTo: '/warning-center?tab=overdue',
    },
    {
      title: '满意度',
      value: `${dashboardStats.satisfaction}分`,
      icon: <Star size={24} />,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      trend: '+0.3',
      trendUp: true,
    },
    {
      title: '平均办理时长',
      value: `${dashboardStats.avgProcessDays}天`,
      icon: <Timer size={24} />,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      trend: '-0.5天',
      trendUp: false,
    },
  ];

  const trendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#f0f0f0',
      textStyle: { color: '#333' },
    },
    legend: {
      data: ['投诉量', '办结量'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dashboardStats.trendData.map((d) => d.date),
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#999' },
    },
    series: [
      {
        name: '投诉量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: dashboardStats.trendData.map((d) => d.count),
        lineStyle: { color: '#1890ff', width: 3 },
        itemStyle: { color: '#1890ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24,144,255,0.3)' },
              { offset: 1, color: 'rgba(24,144,255,0.02)' },
            ],
          },
        },
      },
      {
        name: '办结量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: dashboardStats.trendData.map((d) => d.completed),
        lineStyle: { color: '#52c41a', width: 3 },
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82,196,26,0.3)' },
              { offset: 1, color: 'rgba(82,196,26,0.02)' },
            ],
          },
        },
      },
    ],
  };

  const categoryOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: '#666', fontSize: 12 },
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
        data: dashboardStats.categoryData.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96'][index % 5],
          },
        })),
      },
    ],
  };

  const sourceOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dashboardStats.sourceData.map((d) => d.name),
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#999' },
    },
    series: [
      {
        type: 'bar',
        barWidth: '40%',
        data: dashboardStats.sourceData.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: ['#1890ff', '#722ed1', '#13c2c2'][index],
            borderRadius: [4, 4, 0, 0],
          },
        })),
      },
    ],
  };

  return (
    <div className="space-y-5">
      <Row gutter={[16, 16]}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} md={8} lg={4} key={index}>
            <Card
              className={`h-full border-0 shadow-sm transition-all duration-300 ${
                card.linkTo ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'hover:shadow-md'
              }`}
              styles={{ body: { padding: '20px' } }}
              onClick={() => card.linkTo && navigate(card.linkTo)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-2">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mb-2">{card.value}</p>
                  <div
                    className={`inline-flex items-center gap-1 text-xs ${
                      card.trendUp ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    <TrendingUp
                      size={12}
                      className={card.trendUp ? '' : 'rotate-180'}
                    />
                    <span>较上月 {card.trend}</span>
                  </div>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center ${card.iconColor}`}
                >
                  {card.icon}
                </div>
              </div>
              {card.linkTo && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end text-xs text-blue-500 hover:text-blue-600">
                  查看详情 <ChevronRight size={14} />
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        className="shadow-sm border-0"
        title={
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              时限预警概览
            </span>
            <span
              className="text-sm text-blue-500 cursor-pointer hover:text-blue-600 flex items-center gap-1"
              onClick={() => navigate('/warning-center')}
            >
              查看全部 <ChevronRight size={14} />
            </span>
          </div>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <div
              className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate('/warning-center?tab=expiring')}
            >
              <div className="flex items-center justify-between mb-2">
                <Clock size={20} className="text-orange-500" />
                <Tag color="orange" className="m-0">
                  {expiringCount} 件
                </Tag>
              </div>
              <p className="text-sm font-medium text-gray-700">即将到期</p>
              <p className="text-xs text-gray-500 mt-1">2天内到期</p>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div
              className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate('/warning-center?tab=overdue')}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle size={20} className="text-red-500" />
                <Tag color="red" className="m-0">
                  {overdueCount} 件
                </Tag>
              </div>
              <p className="text-sm font-medium text-gray-700">已超期</p>
              <p className="text-xs text-gray-500 mt-1">超期未办结</p>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div
              className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate('/warning-center?tab=multiUrge')}
            >
              <div className="flex items-center justify-between mb-2">
                <Bell size={20} className="text-purple-500" />
                <Tag color="purple" className="m-0">
                  {multiUrgeCount} 件
                </Tag>
              </div>
              <p className="text-sm font-medium text-gray-700">多次催办</p>
              <p className="text-xs text-gray-500 mt-1">催办≥2次</p>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div
              className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate('/warning-center?tab=delayPending')}
            >
              <div className="flex items-center justify-between mb-2">
                <Clock4 size={20} className="text-cyan-500" />
                <Tag color="cyan" className="m-0">
                  {delayPendingCount} 件
                </Tag>
              </div>
              <p className="text-sm font-medium text-gray-700">延期待审批</p>
              <p className="text-xs text-gray-500 mt-1">等待审批</p>
            </div>
          </Col>
        </Row>
        {highRiskCount > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">
                当前有 <strong className="text-red-600">{highRiskCount}</strong> 件高风险工单，请及时关注处理
              </span>
            </div>
            <Button
              type="primary"
              danger
              size="small"
              onClick={() => navigate('/warning-center?riskLevel=high')}
            >
              立即处理
            </Button>
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span className="font-semibold">近30天投诉趋势</span>}
            className="shadow-sm border-0"
          >
            <ReactECharts option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span className="font-semibold">事项分类占比</span>}
            className="shadow-sm border-0"
          >
            <ReactECharts option={categoryOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title={<span className="font-semibold">投诉来源分布</span>}
            className="shadow-sm border-0"
          >
            <ReactECharts option={sourceOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <span className="font-semibold flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                热点区域排行
              </span>
            }
            className="shadow-sm border-0"
          >
            <List
              dataSource={dashboardStats.areaRank}
              renderItem={(item, index) => {
                const areaInfo = areas.find((a) => a.name === item.name);
                return (
                  <List.Item
                    className="px-0 py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                    onClick={() =>
                      areaInfo &&
                      navigate(`/warning-center?tab=overdue&areaId=${areaInfo.id}`)
                    }
                  >
                    <div className="flex items-center w-full">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mr-3 ${
                          index < 3
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 text-gray-700">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600 font-semibold">{item.count}件</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <span className="font-semibold flex items-center gap-2">
                <Repeat size={16} className="text-orange-500" />
                重复投诉TOP5
              </span>
            }
            className="shadow-sm border-0"
          >
            <List
              dataSource={dashboardStats.repeatTop}
              renderItem={(item) => {
                const areaInfo = areas.find((a) => a.name === item.area);
                return (
                  <List.Item
                    className="px-0 py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                    onClick={() =>
                      navigate(
                        `/warning-center?tab=multiUrge${areaInfo ? `&areaId=${areaInfo.id}` : ''}&riskLevel=high`
                      )
                    }
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700 text-sm truncate flex-1 mr-2">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Tag color="orange" className="m-0">
                            {item.count}次
                          </Tag>
                          <ChevronRight size={14} className="text-gray-400" />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{item.area}</span>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
