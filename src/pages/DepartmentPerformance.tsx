import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Progress,
  Rate,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
  Siren,
  Star,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { departments, statusMap } from '@/data/dictionaries';
import type { Complaint, Department } from '@/types';
import { SatisfactionTag, StatusTag } from '@/components/StatusTags';

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

type RankKey = 'score' | 'total' | 'onTimeRate' | 'avgDuration' | 'returnRate' | 'satisfaction' | 'urgeCount';

interface DepartmentMetric {
  department: Department;
  complaints: Complaint[];
  total: number;
  completedCount: number;
  onTimeCount: number;
  onTimeRate: number;
  avgDuration: number;
  returnCount: number;
  returnRate: number;
  satisfaction: number;
  urgeCount: number;
  score: number;
}

const numberText = (value: number, digits = 1) => Number(value.toFixed(digits));

const getUrgeCount = (complaint: Complaint) => {
  const timelineCount = complaint.timelines.filter((timeline) => timeline.type === 'urge').length;
  return Math.max(timelineCount, complaint.urgeCount || 0);
};

const hasReturn = (complaint: Complaint) =>
  complaint.status === 'returned' || complaint.timelines.some((timeline) => timeline.type === 'return');

const isFinishedOnTime = (complaint: Complaint) =>
  Boolean(complaint.finishedAt) && !dayjs(complaint.finishedAt).isAfter(dayjs(complaint.deadline));

const getDepartmentMetrics = (department: Department, complaints: Complaint[]): DepartmentMetric => {
  const departmentComplaints = complaints.filter((complaint) => complaint.departmentId === department.id);
  const completedComplaints = departmentComplaints.filter(
    (complaint) => complaint.status === 'completed' && complaint.finishedAt
  );
  const ratedComplaints = departmentComplaints.filter((complaint) => complaint.satisfaction);
  const onTimeCount = completedComplaints.filter(isFinishedOnTime).length;
  const returnCount = departmentComplaints.filter(hasReturn).length;
  const urgeCount = departmentComplaints.reduce((sum, complaint) => sum + getUrgeCount(complaint), 0);
  const avgDuration =
    completedComplaints.length > 0
      ? completedComplaints.reduce(
          (sum, complaint) => sum + dayjs(complaint.finishedAt).diff(dayjs(complaint.createdAt), 'hour') / 24,
          0
        ) / completedComplaints.length
      : 0;
  const satisfaction =
    ratedComplaints.length > 0
      ? ratedComplaints.reduce((sum, complaint) => sum + (complaint.satisfaction || 0), 0) /
        ratedComplaints.length
      : 0;
  const onTimeRate = completedComplaints.length > 0 ? (onTimeCount / completedComplaints.length) * 100 : 0;
  const returnRate = departmentComplaints.length > 0 ? (returnCount / departmentComplaints.length) * 100 : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      onTimeRate * 0.35 +
        (satisfaction / 5) * 100 * 0.3 +
        Math.max(0, 100 - returnRate * 2) * 0.2 +
        Math.max(0, 100 - avgDuration * 12) * 0.1 +
        Math.max(0, 100 - urgeCount * 6) * 0.05
    )
  );

  return {
    department,
    complaints: departmentComplaints,
    total: departmentComplaints.length,
    completedCount: completedComplaints.length,
    onTimeCount,
    onTimeRate: numberText(onTimeRate),
    avgDuration: numberText(avgDuration),
    returnCount,
    returnRate: numberText(returnRate),
    satisfaction: numberText(satisfaction),
    urgeCount,
    score: numberText(score),
  };
};

const DepartmentPerformance: React.FC = () => {
  const navigate = useNavigate();
  const { complaints } = useAppStore();
  const [rankKey, setRankKey] = useState<RankKey>('score');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const scopedComplaints = useMemo(() => {
    if (!range || !range[0] || !range[1]) return complaints;
    const [start, end] = range;
    return complaints.filter((complaint) =>
      dayjs(complaint.createdAt).isBetween(start.startOf('day'), end.endOf('day'), null, '[]')
    );
  }, [complaints, range]);

  const metrics = useMemo(
    () =>
      departments
        .map((department) => getDepartmentMetrics(department, scopedComplaints))
        .sort((left, right) => {
          if (rankKey === 'avgDuration' || rankKey === 'returnRate' || rankKey === 'urgeCount') {
            return left[rankKey] - right[rankKey];
          }
          return right[rankKey] - left[rankKey];
        }),
    [rankKey, scopedComplaints]
  );

  const selectedMetric = useMemo(
    () => metrics.find((item) => item.department.id === selectedDepartmentId) || null,
    [metrics, selectedDepartmentId]
  );

  const summary = useMemo(() => {
    const total = metrics.reduce((sum, item) => sum + item.total, 0);
    const completed = metrics.reduce((sum, item) => sum + item.completedCount, 0);
    const onTime = metrics.reduce((sum, item) => sum + item.onTimeCount, 0);
    const returns = metrics.reduce((sum, item) => sum + item.returnCount, 0);
    const urges = metrics.reduce((sum, item) => sum + item.urgeCount, 0);
    const rated = scopedComplaints.filter((complaint) => complaint.satisfaction);
    const satisfaction =
      rated.length > 0
        ? rated.reduce((sum, complaint) => sum + (complaint.satisfaction || 0), 0) / rated.length
        : 0;

    return {
      total,
      onTimeRate: completed > 0 ? numberText((onTime / completed) * 100) : 0,
      returnRate: total > 0 ? numberText((returns / total) * 100) : 0,
      satisfaction: numberText(satisfaction),
      urges,
    };
  }, [metrics, scopedComplaints]);

  const trendOption = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => dayjs().subtract(13 - index, 'day'));
    const topDepartments = metrics.slice(0, 5);

    return {
      color: ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 36, right: 18, top: 48, bottom: 28 },
      xAxis: {
        type: 'category',
        data: days.map((day) => day.format('MM-DD')),
        axisLabel: { color: '#6b7280' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#6b7280' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: topDepartments.map((item) => ({
        name: item.department.name,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: days.map((day) =>
          item.complaints.filter((complaint) => dayjs(complaint.createdAt).isSame(day, 'day')).length
        ),
      })),
    };
  }, [metrics]);

  const selectedTrendOption = useMemo(() => {
    const sourceMetric = selectedMetric || metrics[0];
    const days = Array.from({ length: 14 }, (_, index) => dayjs().subtract(13 - index, 'day'));

    return {
      color: ['#1677ff', '#52c41a', '#f5222d'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 36, right: 18, top: 42, bottom: 28 },
      xAxis: {
        type: 'category',
        data: days.map((day) => day.format('MM-DD')),
        axisLabel: { color: '#6b7280' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#6b7280' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: '投诉量',
          type: 'bar',
          data: days.map((day) =>
            sourceMetric.complaints.filter((complaint) => dayjs(complaint.createdAt).isSame(day, 'day')).length
          ),
        },
        {
          name: '按期办结',
          type: 'line',
          smooth: true,
          data: days.map(
            (day) =>
              sourceMetric.complaints.filter(
                (complaint) =>
                  complaint.status === 'completed' &&
                  complaint.finishedAt &&
                  dayjs(complaint.finishedAt).isSame(day, 'day') &&
                  isFinishedOnTime(complaint)
              ).length
          ),
        },
        {
          name: '退回',
          type: 'line',
          smooth: true,
          data: days.map(
            (day) =>
              sourceMetric.complaints.filter((complaint) =>
                complaint.timelines.some(
                  (timeline) => timeline.type === 'return' && dayjs(timeline.createdAt).isSame(day, 'day')
                )
              ).length
          ),
        },
      ],
    };
  }, [metrics, selectedMetric]);

  const complaintColumns: ColumnsType<Complaint> = [
    {
      title: '投诉编号',
      dataIndex: 'id',
      width: 120,
      render: (id: string) => <span className="font-mono text-blue-600">{id}</span>,
    },
    {
      title: '投诉标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: '按期',
      width: 80,
      render: (_, record) =>
        record.status === 'completed' && record.finishedAt ? (
          <Tag color={isFinishedOnTime(record) ? 'success' : 'error'}>
            {isFinishedOnTime(record) ? '按期' : '逾期'}
          </Tag>
        ) : (
          <Tag>办理中</Tag>
        ),
    },
    {
      title: '退回',
      width: 76,
      render: (_, record) => <Tag color={hasReturn(record) ? 'error' : 'default'}>{hasReturn(record) ? '有' : '无'}</Tag>,
    },
    {
      title: '催办',
      width: 76,
      render: (_, record) => getUrgeCount(record),
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction',
      width: 110,
      render: (score) => <SatisfactionTag score={score} />,
    },
    {
      title: '办理时限',
      dataIndex: 'deadline',
      width: 160,
      render: (deadline: string) => <span className="text-gray-500 text-sm">{deadline}</span>,
    },
    {
      title: '操作',
      width: 86,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<Eye size={14} />} onClick={() => navigate(`/complaints/${record.id}`)}>
          查看
        </Button>
      ),
    },
  ];

  const rankColumns: ColumnsType<DepartmentMetric> = [
    {
      title: '排名',
      width: 72,
      render: (_, __, index) => (
        <span className={index < 3 ? 'font-semibold text-orange-500' : 'text-gray-500'}>#{index + 1}</span>
      ),
    },
    {
      title: '责任单位',
      dataIndex: ['department', 'name'],
      width: 210,
      render: (name: string, record) => (
        <button
          type="button"
          className="text-left text-blue-600 hover:text-blue-700"
          onClick={() => setSelectedDepartmentId(record.department.id)}
        >
          <div className="font-medium">{name}</div>
          <div className="mt-1">
            <Tag color="geekblue">{record.department.type}</Tag>
          </div>
        </button>
      ),
    },
    {
      title: '绩效分',
      dataIndex: 'score',
      width: 170,
      render: (score: number) => (
        <div className="w-36">
          <Progress percent={score} size="small" strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#f5222d'} />
        </div>
      ),
    },
    { title: '投诉量', dataIndex: 'total', width: 90 },
    {
      title: '按期办结率',
      dataIndex: 'onTimeRate',
      width: 120,
      render: (value: number) => <span className={value >= 80 ? 'text-green-600' : 'text-orange-500'}>{value}%</span>,
    },
    {
      title: '平均时长',
      dataIndex: 'avgDuration',
      width: 110,
      render: (value: number) => `${value}天`,
    },
    {
      title: '退回率',
      dataIndex: 'returnRate',
      width: 100,
      render: (value: number) => <span className={value > 20 ? 'text-red-500' : 'text-gray-700'}>{value}%</span>,
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction',
      width: 120,
      render: (value: number) => (
        <Space size={6}>
          <Rate disabled allowHalf value={value} count={5} className="text-sm" />
          <span>{value}</span>
        </Space>
      ),
    },
    { title: '催办次数', dataIndex: 'urgeCount', width: 100 },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={8}>
            <Space size={10}>
              <Building2 size={20} className="text-blue-500" />
              <div>
                <div className="text-base font-semibold text-gray-900">部门绩效考核</div>
                <div className="text-xs text-gray-500">按责任单位归集投诉办理表现</div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <RangePicker
              className="w-full"
              value={range}
              onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Select
              className="w-full"
              value={rankKey}
              onChange={setRankKey}
              options={[
                { label: '综合绩效排行', value: 'score' },
                { label: '投诉量排行', value: 'total' },
                { label: '按期办结率排行', value: 'onTimeRate' },
                { label: '平均办理时长排行', value: 'avgDuration' },
                { label: '退回率排行', value: 'returnRate' },
                { label: '满意度排行', value: 'satisfaction' },
                { label: '催办次数排行', value: 'urgeCount' },
              ]}
            />
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8} xl={5}>
          <Card className="shadow-sm" bordered={false}>
            <Statistic title="投诉量" value={summary.total} prefix={<BarChart3 size={18} />} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={5}>
          <Card className="shadow-sm" bordered={false}>
            <Statistic title="按期办结率" value={summary.onTimeRate} suffix="%" prefix={<CheckCircle2 size={18} />} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={5}>
          <Card className="shadow-sm" bordered={false}>
            <Statistic title="退回率" value={summary.returnRate} suffix="%" prefix={<RotateCcw size={18} />} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={5}>
          <Card className="shadow-sm" bordered={false}>
            <Statistic title="平均满意度" value={summary.satisfaction} suffix="分" prefix={<Star size={18} />} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card className="shadow-sm" bordered={false}>
            <Statistic title="催办次数" value={summary.urges} prefix={<Siren size={18} />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={
              <Space>
                <Trophy size={18} className="text-orange-500" />
                <span>责任单位排行榜</span>
              </Space>
            }
            className="shadow-sm"
          >
            <Table
              rowKey={(record) => record.department.id}
              columns={rankColumns}
              dataSource={metrics}
              scroll={{ x: 1080 }}
              pagination={false}
              onRow={(record) => ({
                onClick: () => setSelectedDepartmentId(record.department.id),
              })}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            title={
              <Space>
                <Activity size={18} className="text-blue-500" />
                <span>近14天部门投诉趋势</span>
              </Space>
            }
            className="shadow-sm"
          >
            <ReactECharts option={trendOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <Clock size={18} className="text-green-500" />
            <span>重点部门绩效拆解</span>
          </Space>
        }
        className="shadow-sm"
      >
        <ReactECharts option={selectedTrendOption} style={{ height: 300 }} />
      </Card>

      <Drawer
        title={selectedMetric?.department.name || '部门详情'}
        open={Boolean(selectedMetric)}
        width={980}
        onClose={() => setSelectedDepartmentId(undefined)}
      >
        {selectedMetric && (
          <div className="space-y-4">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="单位类型">
                <Tag color="geekblue">{selectedMetric.department.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="联系人">{selectedMetric.department.contactName}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{selectedMetric.department.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="负责事项">
                <Space size={[0, 6]} wrap>
                  {selectedMetric.department.responsibilities.map((item) => (
                    <Tag key={item}>{item}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={[12, 12]}>
              <Col xs={12} lg={6}>
                <Card size="small">
                  <Statistic title="投诉量" value={selectedMetric.total} />
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card size="small">
                  <Statistic title="按期办结率" value={selectedMetric.onTimeRate} suffix="%" />
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card size="small">
                  <Statistic title="平均办理时长" value={selectedMetric.avgDuration} suffix="天" />
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card size="small">
                  <Statistic title="催办次数" value={selectedMetric.urgeCount} />
                </Card>
              </Col>
            </Row>

            <Tabs
              items={[
                {
                  key: 'trend',
                  label: '绩效趋势',
                  children: <ReactECharts option={selectedTrendOption} style={{ height: 280 }} />,
                },
                {
                  key: 'complaints',
                  label: '关联投诉明细',
                  children: (
                    <Table
                      rowKey="id"
                      columns={complaintColumns}
                      dataSource={selectedMetric.complaints}
                      scroll={{ x: 980, y: 420 }}
                      pagination={{
                        pageSize: 8,
                        showTotal: (total) => `共 ${total} 条关联投诉`,
                      }}
                    />
                  ),
                },
                {
                  key: 'status',
                  label: '状态分布',
                  children: (
                    <Space size={[8, 8]} wrap>
                      {Object.entries(statusMap).map(([status, label]) => {
                        const count = selectedMetric.complaints.filter((complaint) => complaint.status === status).length;
                        return (
                          <Tag key={status} color={count > 0 ? 'blue' : 'default'}>
                            {label}：{count}
                          </Tag>
                        );
                      })}
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DepartmentPerformance;
