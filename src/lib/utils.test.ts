import { describe, expect, it } from 'vitest';
import { detectDuplicateComplaints, matchDispatchRule } from './utils';
import type { Complaint, DispatchRule } from '@/types';

const makeRule = (overrides: Partial<DispatchRule>): DispatchRule => ({
  id: 'rule-base',
  name: '基础规则',
  categoryId: 'c1-1',
  categoryName: '市容环境',
  areaId: 'a1',
  areaName: '东城区',
  departmentId: 'd1',
  departmentName: '城市管理委员会',
  priority: 1,
  enabled: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const makeComplaint = (overrides: Partial<Complaint>): Complaint => ({
  id: 'complaint-base',
  title: '东城区主街垃圾堆放无人清理',
  content: '小区门口垃圾堆放多日无人清理',
  source: 'web',
  status: 'processing',
  categoryId: 'c1-1',
  categoryName: '市容环境',
  areaId: 'a1',
  areaName: '东城区',
  departmentId: 'd1',
  departmentName: '城市管理委员会',
  createdAt: '2026-06-01T00:00:00.000Z',
  deadline: '2026-06-05T00:00:00.000Z',
  contactName: '张三',
  contactPhone: '13800000000',
  address: '东城区主街18号',
  timelines: [],
  ...overrides,
});

describe('matchDispatchRule', () => {
  it('优先返回精确匹配规则并按priority选择最高规则', () => {
    const rules = [
      makeRule({ id: 'exact-low', priority: 3 }),
      makeRule({ id: 'exact-high', priority: 9 }),
      makeRule({ id: 'same-category', categoryId: 'c1-2', priority: 20 }),
      makeRule({ id: 'area-fallback', categoryId: 'c2-1', priority: 30 }),
    ];

    const result = matchDispatchRule('c1-1', 'a1', rules);

    expect(result.matched).toBe(true);
    expect(result.matchLevel).toBe('exact');
    expect(result.rule?.id).toBe('exact-high');
  });

  it('没有精确规则时匹配同大类兜底规则', () => {
    const rules = [
      makeRule({ id: 'same-parent-low', categoryId: 'c1-2', priority: 2 }),
      makeRule({ id: 'same-parent-high', categoryId: 'c1-3', priority: 7 }),
      makeRule({ id: 'area-only', categoryId: 'c2-1', priority: 30 }),
    ];

    const result = matchDispatchRule('c1-1', 'a1', rules);

    expect(result.matched).toBe(true);
    expect(result.matchLevel).toBe('category_only');
    expect(result.rule?.id).toBe('same-parent-high');
  });

  it('没有精确和同大类规则时匹配区域兜底规则', () => {
    const rules = [
      makeRule({ id: 'wrong-area', categoryId: 'c1-2', areaId: 'a2', priority: 20 }),
      makeRule({ id: 'area-low', categoryId: 'c2-1', priority: 4 }),
      makeRule({ id: 'area-high', categoryId: 'c3-1', priority: 8 }),
    ];

    const result = matchDispatchRule('c1-1', 'a1', rules);

    expect(result.matched).toBe(true);
    expect(result.matchLevel).toBe('area_only');
    expect(result.rule?.id).toBe('area-high');
  });

  it('停用规则不参与任何层级的匹配', () => {
    const rules = [
      makeRule({ id: 'disabled-exact', enabled: false, priority: 100 }),
      makeRule({ id: 'disabled-category', categoryId: 'c1-2', enabled: false, priority: 90 }),
      makeRule({ id: 'enabled-area', categoryId: 'c3-1', priority: 1 }),
    ];

    const result = matchDispatchRule('c1-1', 'a1', rules);

    expect(result.matched).toBe(true);
    expect(result.matchLevel).toBe('area_only');
    expect(result.rule?.id).toBe('enabled-area');
  });

  it('无可用规则时返回未匹配', () => {
    const rules = [
      makeRule({ id: 'disabled-exact', enabled: false }),
      makeRule({ id: 'wrong-area', categoryId: 'c1-2', areaId: 'a2' }),
    ];

    const result = matchDispatchRule('c1-1', 'a1', rules);

    expect(result).toEqual({ matched: false, matchLevel: 'none' });
  });
});

describe('detectDuplicateComplaints', () => {
  const input = {
    title: '东城区主街垃圾堆放无人清理',
    categoryId: 'c1-1',
    areaId: 'a1',
    address: '东城区主街18号',
    contactPhone: '13800000000',
  };

  it('按标题、分类、区域、地址、手机号组合变化后的相似度降序排序', () => {
    const existing = [
      makeComplaint({
        id: 'different-area',
        areaId: 'a2',
        areaName: '西城区',
      }),
      makeComplaint({
        id: 'different-phone',
        contactPhone: '13900000000',
      }),
      makeComplaint({
        id: 'same-parent-category',
        categoryId: 'c1-2',
        categoryName: '违章建筑',
      }),
      makeComplaint({
        id: 'perfect',
      }),
      makeComplaint({
        id: 'different-address',
        address: '东城区另一条街99号',
      }),
    ];

    const results = detectDuplicateComplaints(input, existing, { threshold: 0 });

    expect(results.map((result) => result.complaint.id)).toEqual([
      'perfect',
      'different-phone',
      'same-parent-category',
      'different-area',
      'different-address',
    ]);
    expect(results[0].similarity).toBe(1);
    expect(results[1].detailScores?.phone.matched).toBe(false);
    expect(results[2].matchReasons).toContain('同类大分类');
    expect(results[3].detailScores?.area.matched).toBe(false);
    expect(results[4].detailScores?.address.matched).toBe(false);
  });

  it('过滤低于默认阈值的非重复投诉', () => {
    const results = detectDuplicateComplaints(input, [
      makeComplaint({
        id: 'unrelated',
        title: '公交车长时间不进站',
        categoryId: 'c2-2',
        categoryName: '公共交通',
        areaId: 'a4',
        areaName: '海淀区',
        address: '海淀区中关村大街1号',
        contactPhone: '13911112222',
      }),
    ]);

    expect(results).toEqual([]);
  });

  it('支持excludeId、limit和自定义threshold选项', () => {
    const existing = [
      makeComplaint({ id: 'excluded' }),
      makeComplaint({ id: 'included-high', contactPhone: '13900000000' }),
      makeComplaint({ id: 'included-low', categoryId: 'c1-2', address: '东城区另一条街99号' }),
    ];

    const results = detectDuplicateComplaints(input, existing, {
      excludeId: 'excluded',
      limit: 1,
      threshold: 0.6,
    });

    expect(results).toHaveLength(1);
    expect(results[0].complaint.id).toBe('included-high');
  });

  it('缺少地址或手机号时按可用字段重新归一化相似度', () => {
    const results = detectDuplicateComplaints(
      {
        title: input.title,
        categoryId: input.categoryId,
        areaId: input.areaId,
        contactPhone: '',
      },
      [
        makeComplaint({
          id: 'same-without-optional-fields',
          address: undefined,
          contactPhone: '',
        }),
      ],
    );

    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBe(1);
    expect(results[0].detailScores?.address.matched).toBe(false);
    expect(results[0].detailScores?.phone.matched).toBe(false);
  });
});
