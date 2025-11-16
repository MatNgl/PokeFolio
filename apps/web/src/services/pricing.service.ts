import { type CardPricing, type PriceHistory } from '@pokefolio/types';
import { api } from './api';

export const pricingService = {
  /**
   * Récupère les prix actuels d'une carte
   */
  async getCardPricing(cardId: string): Promise<CardPricing | null> {
    try {
      const response = await api.get<CardPricing>(`/cards/${cardId}/pricing`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des prix:', error);
      return null;
    }
  },

  /**
   * Récupère l'historique des prix d'une carte
   */
  async getPriceHistory(
    cardId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    variant: 'normal' | 'holofoil' | 'reverseHolofoil' = 'normal'
  ): Promise<PriceHistory | null> {
    try {
      const response = await api.get<PriceHistory>(`/cards/${cardId}/price-history`, {
        params: { period, variant },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique des prix:", error);
      return null;
    }
  },
};
