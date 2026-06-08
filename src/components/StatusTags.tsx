import { Tag } from 'antd';
import type { ComplaintStatus, ComplaintSource } from '@/types';
import { statusMap, statusColorMap, sourceMap } from '@/data/dictionaries';

interface StatusTagProps {
  status: ComplaintStatus;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const color = statusColorMap[status] as string;
  return (
    <Tag color={color}>
      {statusMap[status]}
    </Tag>
  );
};

interface SourceTagProps {
  source: ComplaintSource;
}

export const SourceTag: React.FC<SourceTagProps> = ({ source }) => {
  const colorMap: Record<string, string> = {
    web: 'blue',
    hotline: 'purple',
    backend: 'cyan',
  };
  return <Tag color={colorMap[source]}>{sourceMap[source]}</Tag>;
};

interface SatisfactionTagProps {
  score?: number;
}

export const SatisfactionTag: React.FC<SatisfactionTagProps> = ({ score }) => {
  if (!score) return <Tag>未评价</Tag>;
  
  const colorMap: Record<number, string> = {
    5: 'success',
    4: 'success',
    3: 'warning',
    2: 'error',
    1: 'error',
  };
  
  const color = colorMap[score] || 'default';
  return (
    <Tag color={color}>
      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
    </Tag>
  );
};
