import { type Card, type CardSearchResult, type SearchCardsDto } from '@pokefolio/types';

import { api } from './api';

export const cardsService = {
  async searchCards(params: SearchCardsDto): Promise<CardSearchResult> {
    const response = await api.get<CardSearchResult>('/cards/search', { params });
    return response.data;
  },

  async getCardById(cardId: string, lang: 'fr' | 'en' = 'fr'): Promise<Card> {
    const response = await api.get<Card>(`/cards/${cardId}`, { params: { lang } });
    return response.data;
  },
};
