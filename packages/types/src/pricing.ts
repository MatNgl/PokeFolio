/**
 * Types pour les données de prix des cartes Pokemon TCG
 */

/**
 * Marché de prix (TCGPlayer, Cardmarket, etc.)
 */
export type PriceMarket = 'tcgplayer' | 'cardmarket';

/**
 * Prix pour un marché spécifique
 */
export interface MarketPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

/**
 * Données de prix pour une carte
 */
export interface CardPricing {
  cardId: string;
  updatedAt: string;
  prices: {
    normal?: MarketPrice;
    holofoil?: MarketPrice;
    reverseHolofoil?: MarketPrice;
    '1stEditionHolofoil'?: MarketPrice;
    '1stEditionNormal'?: MarketPrice;
  };
}

/**
 * Point de données pour l'historique des prix
 */
export interface PriceHistoryPoint {
  date: string;
  price: number;
  type: 'low' | 'mid' | 'high' | 'market';
}

/**
 * Historique des prix d'une carte
 */
export interface PriceHistory {
  cardId: string;
  period: '7d' | '30d' | '90d' | '1y';
  data: PriceHistoryPoint[];
}

/**
 * Requête pour obtenir l'historique des prix
 */
export interface PriceHistoryQuery {
  cardId: string;
  period?: '7d' | '30d' | '90d' | '1y';
  variant?: 'normal' | 'holofoil' | 'reverseHolofoil' | '1stEditionHolofoil' | '1stEditionNormal';
}
