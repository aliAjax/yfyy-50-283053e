import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type {
  Category,
  Complaint,
  DispatchRule,
  DuplicateComplaintResult,
  DuplicateDetectionInput,
} from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DispatchMatchResult {
  rule?: DispatchRule;
  matchLevel: 'area_category' | 'category' | 'parent_category' | 'none';
}

const getParentCategoryId = (categories: Category[], categoryId: string) => {
  return categories.find((category) => category.id === categoryId)?.parentId;
};

export function matchDispatchRule(
  dispatchRules: DispatchRule[],
  categories: Category[],
  categoryId: string,
  areaId?: string
): DispatchMatchResult {
  const enabledRules = dispatchRules.filter((rule) => rule.enabled);
  const parentCategoryId = getParentCategoryId(categories, categoryId);
  const rankedRules = enabledRules
    .map((rule) => {
      let matchLevel: DispatchMatchResult['matchLevel'] = 'none';
      let score = -1;

      if (rule.categoryId === categoryId && rule.areaId && rule.areaId === areaId) {
        matchLevel = 'area_category';
        score = 300;
      } else if (rule.categoryId === categoryId && !rule.areaId) {
        matchLevel = 'category';
        score = 200;
      } else if (parentCategoryId && rule.categoryId === parentCategoryId && !rule.areaId) {
        matchLevel = 'parent_category';
        score = 100;
      }

      return {
        rule,
        matchLevel,
        score: score + rule.priority,
      };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = rankedRules[0];
  return bestMatch
    ? { rule: bestMatch.rule, matchLevel: bestMatch.matchLevel }
    : { matchLevel: 'none' };
}

const normalizeText = (text?: string) =>
  (text || '').toLowerCase().replace(/\s+/g, '').trim();

const levenshteinDistance = (left: string, right: string): number => {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a && !b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const rows = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1][j - 1]
          : Math.min(rows[i - 1][j], rows[i][j - 1], rows[i - 1][j - 1]) + 1;
    }
  }

  return rows[a.length][b.length];
};

const stringSimilarity = (left?: string, right?: string) => {
  const a = normalizeText(left);
  const b = normalizeText(right);
  const maxLength = Math.max(a.length, b.length);
  if (!maxLength) return 0;
  return (maxLength - levenshteinDistance(a, b)) / maxLength;
};

const tokenSimilarity = (left?: string, right?: string) => {
  const getTokens = (text?: string) =>
    Array.from(new Set(normalizeText(text).match(/[\u4e00-\u9fa5]{2,}|[a-z0-9]+/g) || []));
  const leftTokens = getTokens(left);
  const rightTokens = getTokens(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const rightSet = new Set(rightTokens);
  const intersection = leftTokens.filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
};

const textSimilarity = (left?: string, right?: string) =>
  stringSimilarity(left, right) * 0.45 + tokenSimilarity(left, right) * 0.55;

const getCategoryRoot = (categories: Category[], categoryId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  return category?.parentId || category?.id || categoryId;
};

export function detectDuplicateComplaints(
  input: DuplicateDetectionInput,
  complaints: Complaint[],
  categories: Category[],
  options?: { excludeId?: string; threshold?: number; limit?: number }
): DuplicateComplaintResult[] {
  const threshold = options?.threshold ?? 0.5;
  const limit = options?.limit ?? 8;

  return complaints
    .filter((complaint) => complaint.id !== options?.excludeId)
    .map((complaint) => {
      const matchReasons: string[] = [];
      const titleScore = textSimilarity(input.title, complaint.title);
      const addressScore = textSimilarity(input.address, complaint.address);
      const sameCategory = input.categoryId === complaint.categoryId;
      const sameRootCategory =
        getCategoryRoot(categories, input.categoryId) === getCategoryRoot(categories, complaint.categoryId);
      const sameArea = input.areaId === complaint.areaId;
      const samePhone = Boolean(input.contactPhone && input.contactPhone === complaint.contactPhone);

      if (titleScore >= 0.7) matchReasons.push('标题高度相似');
      else if (titleScore >= 0.4) matchReasons.push('标题部分相似');
      if (sameCategory) matchReasons.push('分类相同');
      else if (sameRootCategory) matchReasons.push('同属上级分类');
      if (sameArea) matchReasons.push('区域相同');
      if (addressScore >= 0.7) matchReasons.push('地址高度相似');
      else if (addressScore >= 0.45) matchReasons.push('地址部分相似');
      if (samePhone) matchReasons.push('联系电话相同');

      const similarity =
        titleScore * 0.35 +
        (sameCategory ? 0.2 : sameRootCategory ? 0.1 : 0) +
        (sameArea ? 0.15 : 0) +
        addressScore * 0.2 +
        (samePhone ? 0.1 : 0);

      return {
        complaint,
        similarity: Math.round(similarity * 100) / 100,
        matchReasons,
      };
    })
    .filter((result) => result.similarity >= threshold && result.matchReasons.length > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export const getSimilarityLevel = (similarity: number): 'high' | 'medium' | 'low' => {
  if (similarity >= 0.75) return 'high';
  if (similarity >= 0.6) return 'medium';
  return 'low';
};

export const getSimilarityColor = (similarity: number) => {
  const level = getSimilarityLevel(similarity);
  if (level === 'high') return '#f5222d';
  if (level === 'medium') return '#fa8c16';
  return '#52c41a';
};

export const getSimilarityLabel = (similarity: number) => {
  const level = getSimilarityLevel(similarity);
  if (level === 'high') return '高度相似';
  if (level === 'medium') return '中度相似';
  return '低度相似';
};
