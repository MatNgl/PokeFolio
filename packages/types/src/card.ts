import { type CardLanguage } from './common';

/**
 * TCGdex card image URLs
 */
export interface CardImage {
  small?: string;
  large?: string;
}

/**
 * TCGdex set information
 */
export interface CardSet {
  id: string;
  name?: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  total?: number;
}

/**
 * TCGdex card localized name
 */
export interface CardName {
  fr?: string;
  en?: string;
  ja?: string;
  zh?: string;
}

/**
 * Card rarity
 */
export type CardRarity = string;

/**
 * Card type (energy)
 */
export type CardType = string;

/**
 * Card category
 */
export type CardCategory = 'Pokemon' | 'Trainer' | 'Energy';

/**
 * Card snapshot stored in portfolio
 */
export interface CardSnapshot {
  name: CardName;
  set: CardSet;
  number?: string;
  rarity?: CardRarity;
  types?: CardType[];
  category?: CardCategory;
  images?: CardImage;
  hp?: number;
  illustrator?: string;
}

/**
 * Full card data from TCGdex
 */
export interface Card extends CardSnapshot {
  id: string;
  localId: string;
  dexId?: number[];
  level?: string;
  stage?: string;
  evolveFrom?: string;
  description?: string;
  regulationMark?: string;
}

/**
 * Card search query params
 */
export interface CardSearchQuery {
  q?: string;
  lang?: CardLanguage;
  page?: number;
  limit?: number;
  set?: string;
  rarity?: string;
  types?: string;
}

/**
 * Card search result
 */
export interface CardSearchResult {
  id: string;
  name: string;
  image?: string;
  set?: string;
  number?: string;
  rarity?: string;
}
