import { useState } from 'react';
import { Card, Tabs, Row, Col, Statistic, List, Tag, Progress, Select, DatePicker, Rate } from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  Clock,
  AlertTriangle,
  Star,
  Repeat,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MapPin,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import { departments, areas } from '@/data/dictionaries';

const { RangePicker } = DatePicker;

const Statistics: React.FC = () => {
  const { complaints, dashboardStats } = useAppStore();
  const [activeTab, setActiveTab] = useState('duration');

  const completedComplaints = complaints.filter((c) => c.status === 'completed' && c.finishedAt);

  const avgDuration =
    completedComplaints.length > 0
      ? completedComplaints.reduce((sum, c) => {
          const days = dayjs(c.finishedAt!).diff(dayjs(c.createdAt), 'day');
          return sum + days;
        }, 0) / completedComplaints.length
      : 0;

  const overdueCount = complaints.filter(
    (c) =>
      (c.status === 'processing' || c.status === 'returned') &&
      dayjs().isAfter(dayjs(c.deadline))
  ).length;
  const overdueRate = complaints.length > 0 ? ((overdueCount / complaints.length) * 100).toFixed(1) : '0';

  const avgSatisfaction = dashboardStats?.satisfaction || 0;

  const repeatCount = complaints.filter((c) => c.isRepeat).length;
  const repeatRate = complaints.length > 0 ? ((repeatCount / complaints.length) * 100).toFixed(1) : '0';

  const categoryDurationData = (() => {
    const categoryMap = new Map<string, { total: number; count: number }>();
    completedComplaints.forEach((c) => {
      const cat = c.categoryName.split(' - ')[0];
      const days = dayjs(c.finishedAt!).diff(dayjs(c.createdAt), 'day');
      const current = categoryMap.get(cat) || { total: 0, count: 0 };
      categoryMap.set(cat, { total: current.total + days, count: current.count + 1 });
    });
    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      value: Number((data.total / data.count).toFixed(1)),
    }));
  })();

  const deptOverdueData = (() => {
    const deptMap = new Map<string, { total: number; overdue: number }>();
    complaints.forEach((c) => {
      const current = deptMap.get(c.departmentName) || { total: 0, overdue: 0 };
      const isOverdue =
        c.status !== 'completed' && dayjs().isAfter(dayjs(c.deadline));
      deptMap.set(c.departmentName, {
        total: current.total + 1,
        overdue: current.overdue + (isOverdue ? 1 : 0),
      });
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({
        name,
        rate: Number(((data.overdue / data.total) * 100).toFixed(1)),
        total: data.total,
        overdue: data.overdue,
      }))
      .sort((a, b) => b.rate - a.rate);
  })();

  const satisfactionDist = (() => {
    const dist = [0, 0, 0, 0, 0];
    completedComplaints.forEach((c) => {
      if (c.satisfaction && c.satisfaction >= 1 && c.satisfaction <= 5) {
        dist[c.satisfaction - 1]++;
      }
    });
    return dist.map((count, index) => ({
      name: `${index + 1}星`,
      value: count,
    }));
  })();

  const repeatByArea = (() => {
    const areaMap = new Map<string, { total: number; repeat: number }>();
    complaints.forEach((c) => {
      const current = areaMap.get(c.areaName) || { total: 0, repeat: 0 };
      areaMap.set(c.areaName, {
        total: current.total + 1,
        repeat: current.repeat + (c.isRepeat ? 1 : 0),
      });
    });
    return Array.from(areaMap.entries())
      .map(([name, data]) => ({
        name,
        rate: Number(((data.repeat / data.total) * 100).toFixed(1)),
        total: data.total,
        repeat: data.repeat,
      }))
      .sort((a, b) => b.rate - a.rate);
  })();

  const durationTrendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 天',
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
      data: dashboardStats?.trendData.slice(-14).map((d) => d.date) || [],
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'value',
      name: '天数',
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#999' },
    },
    series: [
      {
        type: 'bar',
        data: Array(14).fill(0).map(() => Math.random() * 3 + 2),
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
        barWidth: '50%',
      },
    ],
  };

  const categoryDurationOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c} 天',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: '天数',
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'category',
      data: categoryDurationData.map((d) => d.name),
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' },
    },
    series: [
      {
        type: 'bar',
        data: categoryDurationData.map((d) => d.value),
        itemStyle: {
          color: '#52c41a',
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: '60%',
      },
    ],
  };

  const deptOverdueOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c}%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: '超期率(%)',
      max: 30,
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'category',
      data: deptOverdueData.map((d) => d.name),
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#666' },
    },
    series: [
      {
        type: 'bar',
        data: deptOverdueData.map((d) => d.rate),
        itemStyle: {
          color: (params: any) => {
            if (params.value > 15) return '#f5222d';
            if (params.value > 8) return '#faad14';
            return '#52c41a';
          },
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: '60%',
      },
    ],
  };

  const satisfactionDistOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
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
        data: satisfactionDist.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: ['#f5222d', '#fa8c16', '#faad14', '#52c41a', '#13c2c2'][index],
          },
        })),
      },
    ],
  };

  const tabItems = [
    {
      key: 'duration',
      label: (
        <span className="flex items-center gap-2">
          <Clock size={16} />
          办理时长分析
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="平均办理时长"
                  value={avgDuration.toFixed(1)}
                  suffix="天"
                  prefix={<Clock size={20} className="text-blue-500" />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <div className="mt-2 flex items-center gap-1 text-sm text-green-500">
                  <TrendingDown size={14} />
                  <span>较上月缩短 0.5 天</span>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="最短办理时长"
                  value={1.2}
                  suffix="天"
                  prefix={<TrendingDown size={20} className="text-green-500" />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="最长办理时长"
                  value={12.5}
                  suffix="天"
                  prefix={<TrendingUp size={20} className="text-red-500" />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title="办理时长趋势（近14天）" className="shadow-sm">
                <ReactECharts option={durationTrendOption} style={{ height: 320 }} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="各分类平均办理时长" className="shadow-sm">
                <ReactECharts option={categoryDurationOption} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>

          <Card title="各部门办理时长排行" className="shadow-sm">
            <List
              dataSource={departments.slice(0, 8)}
              renderItem={(item, index) => (
                <List.Item className="px-0 py-3">
                  <div className="flex items-center w-full">
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mr-3 ${
                        index < 3
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 text-gray-700">{item.name}</span>
                    <div className="w-32 mr-4">
                      <Progress
                        percent={Math.random() * 40 + 30}
                        size="small"
                        strokeColor={index < 3 ? '#52c41a' : '#1890ff'}
                        showInfo={false}
                      />
                    </div>
                    <span className="text-blue-600 font-semibold w-20 text-right">
                      {(Math.random() * 4 + 2).toFixed(1)} 天
                    </span>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'overdue',
      label: (
        <span className="flex items-center gap-2">
          <AlertTriangle size={16} />
          超期率分析
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="总体超期率"
                  value={overdueRate}
                  suffix="%"
                  prefix={<AlertTriangle size={20} className="text-orange-500" />}
                  valueStyle={{ color: '#fa8c16' }}
                />
                <div className="mt-2 flex items-center gap-1 text-sm text-green-500">
                  <TrendingDown size={14} />
                  <span>较上月下降 2.3%</span>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="超期投诉数"
                  value={overdueCount}
                  suffix="件"
                  prefix={<AlertTriangle size={20} className="text-red-500" />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="按期办结率"
                  value={(100 - Number(overdueRate)).toFixed(1)}
                  suffix="%"
                  prefix={<TrendingUp size={20} className="text-green-500" />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title="各部门超期率排行" className="shadow-sm">
                <ReactECharts option={deptOverdueOption} style={{ height: 360 }} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="超期原因分布" className="shadow-sm">
                <List
                  dataSource={[
                    { name: '涉及多部门协调', count: 12, percent: 30 },
                    { name: '问题复杂处理难度大', count: 10, percent: 25 },
                    { name: '责任单位重视不够', count: 8, percent: 20 },
                    { name: '群众诉求反复变化', count: 6, percent: 15 },
                    { name: '其他原因', count: 4, percent: 10 },
                  ]}
                  renderItem={(item, index) => (
                    <List.Item className="px-0 py-2">
                      <div className="w-full">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-sm text-gray-500">{item.count}件</span>
                        </div>
                        <Progress
                          percent={item.percent}
                          size="small"
                          strokeColor={[
                            '#f5222d',
                            '#fa8c16',
                            '#faad14',
                            '#52c41a',
                            '#1890ff',
                          ][index]}
                          showInfo={false}
                        />
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'satisfaction',
      label: (
        <span className="flex items-center gap-2">
          <Star size={16} />
          满意度分析
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="平均满意度"
                  value={avgSatisfaction}
                  suffix="分"
                  prefix={<Star size={20} className="text-yellow-500" />}
                  valueStyle={{ color: '#faad14' }}
                />
                <div className="mt-2">
                  <Rate disabled defaultValue={avgSatisfaction} />
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-green-500">
                  <TrendingUp size={14} />
                  <span>较上月提升 0.3 分</span>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="评价率"
                  value={68.5}
                  suffix="%"
                  prefix={<Star size={20} className="text-blue-500" />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="非常满意率"
                  value={42.3}
                  suffix="%"
                  prefix={<Star size={20} className="text-green-500" />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
              <Card title="满意度分布" className="shadow-sm">
                <ReactECharts option={satisfactionDistOption} style={{ height: 320 }} />
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card title="各部门满意度排行" className="shadow-sm">
                <List
                  dataSource={departments.slice(0, 8)}
                  renderItem={(item, index) => {
                    const score = Math.random() * 1.5 + 3.5;
                    return (
                      <List.Item className="px-0 py-3">
                        <div className="flex items-center w-full">
                          <span
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mr-3 ${
                              index < 3
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="flex-1 text-gray-700">{item.name}</span>
                          <Rate disabled defaultValue={score} style={{ fontSize: 14 }} />
                          <span className="text-yellow-600 font-semibold w-16 text-right ml-3">
                            {score.toFixed(1)}分
                          </span>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'repeat',
      label: (
        <span className="flex items-center gap-2">
          <Repeat size={16} />
          重复投诉分析
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="重复投诉率"
                  value={repeatRate}
                  suffix="%"
                  prefix={<Repeat size={20} className="text-red-500" />}
                  valueStyle={{ color: '#f5222d' }}
                />
                <div className="mt-2 flex items-center gap-1 text-sm text-green-500">
                  <TrendingDown size={14} />
                  <span>较上月下降 1.2%</span>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="重复投诉数"
                  value={repeatCount}
                  suffix="件"
                  prefix={<Repeat size={20} className="text-orange-500" />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm">
                <Statistic
                  title="最高重复次数"
                  value={5}
                  suffix="次"
                  prefix={<AlertTriangle size={20} className="text-red-500" />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <MapPin size={16} className="text-orange-500" />
                    各区域重复投诉率
                  </span>
                }
                className="shadow-sm"
              >
                <List
                  dataSource={repeatByArea}
                  renderItem={(item, index) => (
                    <List.Item className="px-0 py-2.5">
                      <div className="w-full">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-sm text-orange-600 font-medium">
                            {item.repeat}件 / {item.rate}%
                          </span>
                        </div>
                        <Progress
                          percent={item.rate * 3}
                          size="small"
                          strokeColor={item.rate > 5 ? '#f5222d' : item.rate > 3 ? '#faad14' : '#52c41a'}
                          showInfo={false}
                        />
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    重复投诉类型TOP10
                  </span>
                }
                className="shadow-sm"
              >
                <List
                  dataSource={[
                    { name: '占道经营', count: 8, area: '朝阳区' },
                    { name: '噪音污染', count: 6, area: '海淀区' },
                    { name: '垃圾清运', count: 5, area: '丰台区' },
                    { name: '违章建筑', count: 4, area: '西城区' },
                    { name: '停车管理', count: 4, area: '东城区' },
                    { name: '物业服务', count: 3, area: '通州区' },
                    { name: '道路养护', count: 3, area: '大兴区' },
                    { name: '园林绿化', count: 2, area: '石景山区' },
                  ]}
                  renderItem={(item, index) => (
                    <List.Item className="px-0 py-2">
                      <div className="flex items-center w-full">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mr-3 ${
                            index < 3
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="flex-1 text-gray-700">{item.name}</span>
                        <Tag color="orange">{item.count}次</Tag>
                        <span className="text-xs text-gray-400 ml-2 w-20 text-right">
                          {item.area}
                        </span>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">统计周期：</span>
          <RangePicker
            defaultValue={[dayjs().subtract(30, 'day'), dayjs()]}
            style={{ width: 280 }}
          />
          <Select defaultValue="all" style={{ width: 140 }}>
            <Select.Option value="all">全部区域</Select.Option>
            {areas.map((a) => (
              <Select.Option key={a.id} value={a.id}>
                {a.name}
              </Select.Option>
            ))}
          </Select>
          <Select defaultValue="all" style={{ width: 140 }}>
            <Select.Option value="all">全部分类</Select.Option>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm" styles={{ body: { padding: '12px 24px 0' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default Statistics;
