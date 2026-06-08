import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DispatchRule, Department, Complaint, DuplicateComplaintResult, DuplicateDetectionInput } from '@/types';
import { categories } from '@/data/dictionaries';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DispatchMatchResult {
  matched: boolean;
  rule?: DispatchRule;
  department?: Department;
  matchLevel: 'exact' | 'category_only' | 'area_only' | 'none';
}

export const matchDispatchRule = (
  categoryId: string,
  areaId: string,
  rules: DispatchRule[]
): DispatchMatchResult => {
  const enabledRules = rules.filter(r => r.enabled);

  const exactMatch = enabledRules
    .filter(r => r.categoryId === categoryId && r.areaId === areaId)
    .sort((a, b) => b.priority - a.priority)[0];

  if (exactMatch) {
    return {
      matched: true,
      rule: exactMatch,
      matchLevel: 'exact',
    };
  }

  const parentCategory = categories.find(c => c.id === categoryId)?.parentId;
  const categoryMatch = enabledRules
    .filter(r => {
      const ruleParentCat = categories.find(c => c.id === r.categoryId)?.parentId;
      return (r.categoryId === categoryId || ruleParentCat === parentCategory) && r.areaId === areaId;
    })
    .sort((a, b) => b.priority - a.priority)[0];

  if (categoryMatch) {
    return {
      matched: true,
      rule: categoryMatch,
      matchLevel: 'category_only',
    };
  }

  const areaMatch = enabledRules
    .filter(r => r.areaId === areaId)
    .sort((a, b) => b.priority - a.priority)[0];

  if (areaMatch) {
    return {
      matched: true,
      rule: areaMatch,
      matchLevel: 'area_only',
    };
  }

  return {
    matched: false,
    matchLevel: 'none',
  };
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
};

const stringSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(s1, s2);
  return (maxLen - distance) / maxLen;
};

const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  const cleanText = text.toLowerCase().trim();
  const keywords: string[] = [];
  
  const patterns = [
    /[\u4e00-\u9fa5]{2,}/g,
    /[a-zA-Z]+/g,
    /\d+/g,
  ];
  
  patterns.forEach(pattern => {
    const matches = cleanText.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  });
  
  return [...new Set(keywords)];
};

const keywordSimilarity = (text1: string, text2: string): number => {
  const kw1 = extractKeywords(text1);
  const kw2 = extractKeywords(text2);
  
  if (kw1.length === 0 || kw2.length === 0) return 0;
  
  const set1 = new Set(kw1);
  const set2 = new Set(kw2);
  
  const intersection = [...set1].filter(k => set2.has(k));
  const union = [...new Set([...set1, ...set2])];
  
  return intersection.length / union.length;
};

const combinedTextSimilarity = (text1: string, text2: string): number => {
  const levSim = stringSimilarity(text1, text2);
  const kwSim = keywordSimilarity(text1, text2);
  return levSim * 0.4 + kwSim * 0.6;
};

interface SimilarityWeights {
  title: number;
  category: number;
  area: number;
  address: number;
  phone: number;
}

const DEFAULT_WEIGHTS: SimilarityWeights = {
  title: 0.35,
  category: 0.2,
  area: 0.15,
  address: 0.2,
  phone: 0.1,
};

const SIMILARITY_THRESHOLD = 0.5;

export const detectDuplicateComplaints = (
  input: DuplicateDetectionInput,
  existingComplaints: Complaint[],
  options?: {
    threshold?: number;
    weights?: Partial<SimilarityWeights>;
    limit?: number;
    excludeId?: string;
  }
): DuplicateComplaintResult[] => {
  const threshold = options?.threshold ?? SIMILARITY_THRESHOLD;
  const weights = { ...DEFAULT_WEIGHTS, ...options?.weights };
  const limit = options?.limit ?? 10;
  const excludeId = options?.excludeId;

  const results: DuplicateComplaintResult[] = [];

  for (const complaint of existingComplaints) {
    if (excludeId && complaint.id === excludeId) continue;

    const matchReasons: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    const titleSim = combinedTextSimilarity(input.title, complaint.title);
    if (titleSim >= 0.3) {
      totalScore += titleSim * weights.title;
      totalWeight += weights.title;
      if (titleSim >= 0.6) {
        matchReasons.push('标题高度相似');
      } else if (titleSim >= 0.4) {
        matchReasons.push('标题部分相似');
      }
    }

    if (input.categoryId === complaint.categoryId) {
      totalScore += weights.category;
      totalWeight += weights.category;
      matchReasons.push('分类相同');
    } else {
      const parentCat1 = categories.find(c => c.id === input.categoryId)?.parentId;
      const parentCat2 = categories.find(c => c.id === complaint.categoryId)?.parentId;
      if (parentCat1 && parentCat2 && parentCat1 === parentCat2) {
        totalScore += weights.category * 0.5;
        totalWeight += weights.category;
        matchReasons.push('同类大分类');
      }
    }

    if (input.areaId === complaint.areaId) {
      totalScore += weights.area;
      totalWeight += weights.area;
      matchReasons.push('区域相同');
    }

    if (input.address && complaint.address) {
      const addrSim = combinedTextSimilarity(input.address, complaint.address);
      if (addrSim >= 0.3) {
        totalScore += addrSim * weights.address;
        totalWeight += weights.address;
        if (addrSim >= 0.7) {
          matchReasons.push('地址高度相似');
        } else if (addrSim >= 0.5) {
          matchReasons.push('地址部分相似');
        }
      }
    }

    if (input.contactPhone && complaint.contactPhone) {
      const phoneMatch = input.contactPhone === complaint.contactPhone;
      if (phoneMatch) {
        totalScore += weights.phone;
        totalWeight += weights.phone;
        matchReasons.push('联系电话相同');
      }
    }

    const similarity = totalWeight > 0 ? totalScore / totalWeight : 0;

    if (similarity >= threshold) {
      results.push({
        complaint,
        similarity: Math.round(similarity * 100) / 100,
        matchReasons,
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
};

export const getSimilarityLevel = (similarity: number): 'high' | 'medium' | 'low' => {
  if (similarity >= 0.75) return 'high';
  if (similarity >= 0.55) return 'medium';
  return 'low';
};

export const getSimilarityColor = (similarity: number): string => {
  const level = getSimilarityLevel(similarity);
  switch (level) {
    case 'high': return '#f5222d';
    case 'medium': return '#fa8c16';
    case 'low': return '#52c41a';
    default: return '#d9d9d9';
  }
};

export const getSimilarityLabel = (similarity: number): string => {
  const level = getSimilarityLevel(similarity);
  switch (level) {
    case 'high': return '高度相似';
    case 'medium': return '中度相似';
    case 'low': return '低度相似';
    default: return '不相似';
  }
};
