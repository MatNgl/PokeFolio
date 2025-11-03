import { type CardLanguage } from './common';
import { type CardSnapshot } from './card';
import { type GradingInfo } from './grading';

/**
 * Portfolio item entity
 */
export interface PortfolioItem {
  id: string;
  ownerId: string;
  cardId: string;
  language: CardLanguage;
  quantity: number;
  booster: boolean;
  purchasePriceCents: number;
  purchaseDate: Date;
  graded: boolean;
  grading?: GradingInfo;
  notes?: string;
  cardSnapshot?: CardSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create portfolio item DTO
 */
export interface CreatePortfolioItemDto {
  cardId: string;
  language: CardLanguage;
  quantity: number;
  booster?: boolean;
  purchasePriceCents: number;
  purchaseDate: string | Date;
  graded?: boolean;
  grading?: GradingInfo;
  notes?: string;
}

/**
 * Update portfolio item DTO
 */
export interface UpdatePortfolioItemDto {
  language?: CardLanguage;
  quantity?: number;
  booster?: boolean;
  purchasePriceCents?: number;
  purchaseDate?: string | Date;
  graded?: boolean;
  grading?: GradingInfo;
  notes?: string;
}

/**
 * Portfolio view mode
 */
export type PortfolioViewMode = 'grid' | 'compact';

/**
 * Portfolio filter options
 */
export interface PortfolioFilters {
  language?: CardLanguage;
  graded?: boolean;
  booster?: boolean;
  company?: string;
  rarity?: string;
  set?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
  distinct?: boolean;
}

/**
 * Portfolio sort options
 */
export type PortfolioSortField =
  | 'purchaseDate'
  | 'purchasePrice'
  | 'quantity'
  | 'cardName'
  | 'createdAt';

export type PortfolioSortOrder = 'asc' | 'desc';

export interface PortfolioSort {
  field: PortfolioSortField;
  order: PortfolioSortOrder;
}

/**
 * Portfolio query params
 */
export interface PortfolioQuery {
  page?: number;
  limit?: number;
  view?: PortfolioViewMode;
  sort?: string;
  filters?: PortfolioFilters;
}

/**
 * Portfolio summary statistics
 */
export interface PortfolioSummary {
  nbCartes: number;
  nbCartesDistinctes: number;
  coutTotalAchatCents: number;
  nbSets: number;
  nbGraded: number;
}
