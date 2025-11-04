import type { AddCardDto } from '@pokefolio/types';
import { api } from './api';

export type PortfolioCard = {
  _id: string;
  userId: string;
  cardId: string;
  name: string;
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  quantity: number;
  isGraded: boolean;
  gradeCompany?: string;
  gradeScore?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const portfolioService = {
  async addCard(dto: AddCardDto): Promise<PortfolioCard> {
    const res = await api.post<PortfolioCard>('/portfolio/cards', dto);
    return res.data;
  },

  async getCards(): Promise<PortfolioCard[]> {
    const res = await api.get<PortfolioCard[]>('/portfolio/cards');
    return res.data;
  },

  async getCard(id: string): Promise<PortfolioCard> {
    const res = await api.get<PortfolioCard>(`/portfolio/cards/${id}`);
    return res.data;
  },

  async updateCard(id: string, payload: Partial<PortfolioCard>): Promise<PortfolioCard> {
    const res = await api.put<PortfolioCard>(`/portfolio/cards/${id}`, payload);
    return res.data;
  },

  async deleteCard(id: string): Promise<void> {
    await api.delete(`/portfolio/cards/${id}`);
  },

  async getStats(): Promise<{
    totalCards: number;
    distinctCards: number;
    totalCost: number;
    totalCurrent: number;
    profit: number;
  }> {
    const res = await api.get('/portfolio/stats');
    return res.data;
  },
};
