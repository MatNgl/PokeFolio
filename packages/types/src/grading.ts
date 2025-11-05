/**
 * Grading companies
 */
export type GradingCompany = 'PSA' | 'CollectAura' | 'BGS' | 'CGC' | 'PCA' | 'Other';

/**
 * PSA grades
 */
export type PSAGrade = '10' | '9' | '8' | '7';

/**
 * Collect Aura grades
 */
export type CollectAuraGrade = '10+' | '10' | '9.5' | '9' | '8.5' | '8' | '7.5' | '7';

/**
 * BGS/CGC/PCA grades
 */
export type StandardGrade = '10' | '9.5' | '9' | '8.5' | '8' | '7.5' | '7';

/**
 * All possible grades union
 */
export type Grade = string;

/**
 * BGS subgrades
 */
export interface BGSSubgrades {
  centering?: number;
  corners?: number;
  edges?: number;
  surface?: number;
}

/**
 * Grading information
 * Note: company et grade sont optionnels pour permettre la compatibilité avec les DTOs
 * et la normalisation. Dans la pratique, une carte gradée devrait avoir au minimum company et grade.
 */
export interface GradingInfo {
  company?: GradingCompany;
  grade?: Grade;
  subgrades?: BGSSubgrades;
  certificationNumber?: string;
}

/**
 * Grade validation by company
 */
export const VALID_GRADES: Record<GradingCompany, readonly string[]> = {
  PSA: ['10', '9', '8', '7'],
  CollectAura: ['10+', '10', '9.5', '9', '8.5', '8', '7.5', '7'],
  BGS: ['10', '9.5', '9', '8.5', '8', '7.5', '7'],
  CGC: ['10', '9.5', '9', '8.5', '8', '7.5', '7'],
  PCA: ['10', '9.5', '9', '8.5', '8', '7.5', '7'],
  Other: [],
} as const;
