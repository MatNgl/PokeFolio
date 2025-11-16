/**
 * Ces interfaces sont utilisées uniquement pour les réponses API
 * Pas besoin de decorators class-validator car ce sont des DTOs de sortie
 */

/**
 * Carte dans un set avec ses informations essentielles
 */
export interface SetCardDto {
  itemId: string;
  cardId: string;
  name?: string;
  number?: string;
  imageUrl?: string;
  rarity?: string;
  quantity: number;
  isGraded?: boolean;
  purchasePrice?: number;
}

/**
 * Informations de complétion d'un set
 */
export interface SetCompletionDto {
  owned: number;
  total?: number;
  percentage?: number;
}

/**
 * Set avec ses cartes et informations de complétion
 */
export interface PortfolioSetDto {
  setId: string;
  setName?: string;
  cards: SetCardDto[];
  completion: SetCompletionDto;
  totalValue: number;
  totalQuantity?: number;
}

/**
 * Réponse de l'endpoint /portfolio/sets
 */
export interface PortfolioSetsResponseDto {
  sets: PortfolioSetDto[];
  totalSets: number;
}

/**
 * DTO d'entrée pour vérifier la possession de cartes
 */
export interface CheckOwnershipDto {
  cardIds: string[];
}

/**
 * Réponse de l'endpoint /portfolio/check-ownership
 */
export interface CheckOwnershipResponseDto {
  ownership: Record<string, boolean>;
}
