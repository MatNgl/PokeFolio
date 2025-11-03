import type { UserCard, AddCardDto, UpdateCardDto, PortfolioStats } from '@pokefolio/types';
import { api } from './api';

export const portfolioService = {
  async addCard(data: AddCardDto): Promise<UserCard> {
    const response = await api.post<UserCard>('/portfolio/cards', data);
    return response.data;
  },

  async getCards(): Promise<UserCard[]> {
    const response = await api.get<UserCard[]>('/portfolio/cards');
    return response.data;
  },

  async getCard(id: string): Promise<UserCard> {
    const response = await api.get<UserCard>(`/portfolio/cards/${id}`);
    return response.data;
  },

  async updateCard(id: string, data: UpdateCardDto): Promise<UserCard> {
    const response = await api.put<UserCard>(`/portfolio/cards/${id}`, data);
    return response.data;
  },

  async deleteCard(id: string): Promise<void> {
    await api.delete(`/portfolio/cards/${id}`);
  },

  async getStats(): Promise<PortfolioStats> {
    const response = await api.get<PortfolioStats>('/portfolio/stats');
    return response.data;
  },
};
