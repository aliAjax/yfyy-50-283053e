import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Category, DispatchRule } from "@/types"

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
