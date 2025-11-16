import type { CardLanguage } from './common';
import type { CardSnapshot } from './card';
import type { GradingInfo } from './grading';

/** Variante unitaire (1 carte = 1 variante) */
export interface PortfolioVariant {
  /** Prix d'achat en euros pour CET exemplaire */
  purchasePrice?: number;
  /** Date d'achat (ISO ou Date) pour CET exemplaire */
  purchaseDate?: string | Date;
  /** Boîte/scellé ? (si tu veux le distinguer au niveau variant) */
  booster?: boolean;
  /** Carte gradée ? */
  graded?: boolean;
  /** Infos de gradation (company, grade, certificationNumber) */
  grading?: GradingInfo;
  /** Notes personnelles */
  notes?: string;
}

/**
 * Portfolio item entity (compatible 2 modes)
 * - Mode A (historique) : champs unitaires au niveau item
 * - Mode B (nouveau)    : variants[] remplace les champs unitaires
 */
export interface PortfolioItem {
  id: string;
  ownerId: string;
  cardId: string;
  language: CardLanguage;

  /** Quantité totale ; si variants[] est défini, quantity === variants.length */
  quantity: number;

  /** ===== Mode A : champs unitaires (optionnels si variants[]) ===== */
  booster?: boolean;
  purchasePrice?: number;
  purchaseDate?: Date;
  graded?: boolean;
  grading?: GradingInfo;
  notes?: string;

  /** ===== Mode B : variantes distinctes ===== */
  variants?: PortfolioVariant[];

  /** Snapshot carte (sécuriser l’affichage offline) */
  cardSnapshot?: CardSnapshot;

  createdAt: Date;
  updatedAt: Date;
}

/** Création — 2 modes exclusifs */
export type CreatePortfolioItemDto =
  | {
      // Mode A (mêmes données pour toutes)
      cardId: string;
      language: CardLanguage;
      quantity: number; // >= 1
      booster?: boolean;
      purchasePrice?: number;
      purchaseDate?: string | Date;
      graded?: boolean;
      grading?: GradingInfo;
      notes?: string;
      variants?: undefined;
    }
  | {
      // Mode B (variantes distinctes)
      cardId: string;
      language: CardLanguage;
      /** quantity facultatif, déduit de variants.length si non fourni */
      quantity?: number;
      variants: PortfolioVariant[]; // length >= 1
      // champs unitaires ignorés si variants est fourni
      booster?: undefined;
      purchasePrice?: undefined;
      purchaseDate?: undefined;
      graded?: undefined;
      grading?: undefined;
      notes?: undefined;
    };

/** Mise à jour — autoriser les deux schémas */
export interface UpdatePortfolioItemDto {
  language?: CardLanguage;
  /** En Mode A : maj des champs unitaires ; en Mode B, préférer variants */
  quantity?: number;
  booster?: boolean;
  purchasePrice?: number;
  purchaseDate?: string | Date;
  graded?: boolean;
  grading?: GradingInfo;
  notes?: string;

  /** Passer au Mode B ou mettre à jour ses variantes */
  variants?: PortfolioVariant[]; // si défini, quantity peut être recalculé
}

export type PortfolioViewMode = 'grid' | 'compact' | 'detailed' | 'sets';

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

export interface PortfolioQuery {
  page?: number;
  limit?: number;
  view?: PortfolioViewMode;
  sort?: string;
  filters?: PortfolioFilters;
}

export interface PortfolioSummary {
  nbCartes: number;
  nbCartesDistinctes: number;
  coutTotalAchat: number;
  nbSets: number;
  nbGraded: number;
}
