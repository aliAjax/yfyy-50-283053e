import { Timeline } from 'antd';
import {
  FileCheck2,
  Send,
  Repeat,
  MessageSquare,
  RotateCcw,
  Clock,
  Bell,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import type { TimelineRecord, TimelineType } from '@/types';
import { timelineTypeMap } from '@/data/dictionaries';

const iconMap: Record<TimelineType, React.ReactNode> = {
  accept: <FileCheck2 size={16} />,
  assign: <Send size={16} />,
  transfer: <Repeat size={16} />,
  process: <MessageSquare size={16} />,
  return: <RotateCcw size={16} />,
  delay: <Clock size={16} />,
  urge: <Bell size={16} />,
  review: <CheckCircle2 size={16} />,
  complete: <Archive size={16} />,
};

const colorMap: Record<TimelineType, string> = {
  accept: '#1890ff',
  assign: '#13c2c2',
  transfer: '#722ed1',
  process: '#52c41a',
  return: '#f5222d',
  delay: '#faad14',
  urge: '#fa8c16',
  review: '#52c41a',
  complete: '#1890ff',
};

interface ComplaintTimelineProps {
  records: TimelineRecord[];
}

const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ records }) => {
  const items = records.map((record) => ({
    color: colorMap[record.type as TimelineType] || '#d9d9d9',
    dot: (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
        style={{ backgroundColor: colorMap[record.type as TimelineType] || '#d9d9d9' }}
      >
        {iconMap[record.type as TimelineType]}
      </div>
    ),
    children: (
      <div className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-800 text-sm">
            {timelineTypeMap[record.type]}
          </span>
          <span className="text-xs text-gray-400">{record.operator}</span>
        </div>
        <p className="text-gray-600 text-sm mb-1">{record.content}</p>
        {record.remark && (
          <p className="text-gray-500 text-xs bg-gray-50 px-2 py-1 rounded">
            备注：{record.remark}
          </p>
        )}
        <span className="text-xs text-gray-400">{record.createdAt}</span>
      </div>
    ),
  }));

  return (
    <Timeline
      items={items}
      className="pl-2"
      style={{
        '--ant-color-primary': '#1890ff',
      } as React.CSSProperties}
    />
  );
};

export default ComplaintTimeline;
