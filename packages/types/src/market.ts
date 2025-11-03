import { type CardLanguage } from './common';

/**
 * Cardmarket link generation request
 */
export interface CardmarketLinkDto {
  cardName: string;
  setName: string;
  cardNumber?: string;
  language: CardLanguage;
}

/**
 * Cardmarket link response
 */
export interface CardmarketLinkResponse {
  url: string;
  searchTerm: string;
}

/**
 * Language mapping for Cardmarket
 */
export const CARDMARKET_LANGUAGE_MAP: Record<CardLanguage, string> = {
  fr: 'FR',
  en: 'EN',
  ja: 'JP',
  zh: 'CN',
} as const;
