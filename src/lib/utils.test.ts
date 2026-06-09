import { describe, expect, it } from 'vitest';
import {
  cn,
  detectDuplicateComplaints,
  getSimilarityColor,
  getSimilarityLabel,
  getSimilarityLevel,
  matchDispatchRule,
} from './utils';
import type { Complaint, DispatchRule } from '@/types';

const baseComplaint: Complaint = {
  id: 'C001',
  title: '小区门口占道经营',
  content: '小区门口长期有摊贩占道经营，影响通行。',
  source: 'web',
  status: 'processing',
  categoryId: 'c1-1',
  categoryName: '占道经营',
  areaId: 'a1',
  areaName: '中心城区',
  departmentId: 'd1',
  departmentName: '综合执法局',
  createdAt: '2026-06-01 10:00:00',
  deadline: '2026-06-05 10:00:00',
  contactName: '张三',
  contactPhone: '13800000000',
  address: '中心路小区门口',
  timelines: [],
};

describe('cn', () => {
  it('merges conditional Tailwind class names', () => {
    expect(cn('px-2', undefined, 'px-4')).toBe('px-4');
  });
});

describe('matchDispatchRule', () => {
  const rules: DispatchRule[] = [
    {
      id: 'R1',
      name: '占道经营派单',
      categoryId: 'c1-1',
      categoryName: '占道经营',
      areaId: 'a1',
      areaName: '中心城区',
      departmentId: 'd1',
      departmentName: '综合执法局',
      priority: 10,
      enabled: true,
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    },
  ];

  it('returns the highest priority exact rule', () => {
    const result = matchDispatchRule('c1-1', 'a1', rules);

    expect(result.matched).toBe(true);
    expect(result.matchLevel).toBe('exact');
    expect(result.rule?.id).toBe('R1');
  });

  it('returns no match when no enabled rule applies', () => {
    const result = matchDispatchRule('c2-1', 'a9', rules);

    expect(result.matched).toBe(false);
    expect(result.matchLevel).toBe('none');
  });
});

describe('detectDuplicateComplaints', () => {
  it('detects a high confidence duplicate complaint', () => {
    const results = detectDuplicateComplaints(
      {
        title: '小区门口占道经营',
        categoryId: 'c1-1',
        areaId: 'a1',
        address: '中心路小区门口',
        contactPhone: '13800000000',
      },
      [baseComplaint],
    );

    expect(results).toHaveLength(1);
    expect(results[0].complaint.id).toBe('C001');
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.75);
  });

  it('excludes the supplied complaint id', () => {
    const results = detectDuplicateComplaints(
      {
        title: '小区门口占道经营',
        categoryId: 'c1-1',
        areaId: 'a1',
        address: '中心路小区门口',
        contactPhone: '13800000000',
      },
      [baseComplaint],
      { excludeId: 'C001' },
    );

    expect(results).toHaveLength(0);
  });
});

describe('similarity presentation helpers', () => {
  it('maps similarity scores to consistent levels, colors, and labels', () => {
    expect(getSimilarityLevel(0.8)).toBe('high');
    expect(getSimilarityLabel(0.6)).toBe('中度相似');
    expect(getSimilarityColor(0.4)).toBe('#52c41a');
  });
});
