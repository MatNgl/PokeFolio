import type { PortfolioItem, UpdatePortfolioItemDto } from '@pokefolio/types';
import { api } from './api';

/**
 * Type pour les cartes du portfolio côté frontend
 * Enrichi avec les données de la carte (snapshot ou champs hérités)
 * Note: Certains champs viennent de l'ancien système (isGraded, etc.) pour rétrocompatibilité
 */
export type PortfolioCard = Omit<PortfolioItem, 'createdAt' | 'updatedAt'> & {
  _id?: string;
  id?: string;
  // Dates peuvent être des strings après sérialisation JSON
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Champs enrichis depuis cardSnapshot
  name?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  // Champs de l'ancien système (à supprimer progressivement)
  isGraded?: boolean;
  gradeCompany?: string;
  gradeScore?: string | number;
  purchasePrice?: number;
  currentValue?: number;
  notes?: string;
};

/**
 * Statistiques du portfolio
 * Compatible avec ce que renvoie l'API backend
 */
export interface PortfolioStats {
  nbCartes: number;
  nbCartesDistinctes: number;
  coutTotalAchatCents: number;
  nbSets: number;
  nbGraded: number;
  // Aliases pour compatibilité frontend
  totalCards?: number;
  uniqueCards?: number;
  distinctCards?: number;
  totalCost?: number;
  totalValue?: number;
  totalCurrent?: number;
  gradedCards?: number;
  graded?: number;
  profit?: number;
}

/**
 * Service frontend pour gérer le portfolio
 * Fait des appels HTTP vers l'API backend
 */
export const portfolioService = {
  /**
   * Récupérer toutes les cartes du portfolio
   */
  async getCards(): Promise<PortfolioCard[]> {
    const response = await api.get<PortfolioCard[]>('/portfolio/cards');
    return response.data;
  },

  /**
   * Récupérer une carte spécifique par son ID
   */
  async getCard(id: string): Promise<PortfolioCard> {
    const response = await api.get<PortfolioCard>(`/portfolio/cards/${id}`);
    return response.data;
  },

  /**
   * Ajouter une carte au portfolio
   * Note: Les prix sont stockés en EUROS (float accepté: ex. 149.99)
   */
  async addCard(data: Record<string, unknown>): Promise<PortfolioCard> {
    const response = await api.post<PortfolioCard>('/portfolio/cards', data);
    return response.data;
  },

  /**
   * Mettre à jour une carte du portfolio
   * Note: Les prix sont stockés en EUROS (float accepté: ex. 149.99)
   */
  async updateCard(id: string, data: UpdatePortfolioItemDto): Promise<PortfolioCard> {
    const response = await api.put<PortfolioCard>(`/portfolio/cards/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer une carte du portfolio
   */
  async deleteCard(id: string): Promise<void> {
    await api.delete(`/portfolio/cards/${id}`);
  },

  /**
   * Vérifier la possession de cartes (similaire à checkMultiple de wishlist)
   */
  async checkOwnership(cardIds: string[]): Promise<Record<string, boolean>> {
    if (cardIds.length === 0) {
      return {};
    }
    const response = await api.post<Record<string, boolean>>('/portfolio/check-ownership', {
      cardIds,
    });
    return response.data;
  },

  /**
   * Obtenir les statistiques du portfolio
   */
  async getStats(): Promise<PortfolioStats> {
    const response = await api.get<PortfolioStats>('/portfolio/stats');
    return response.data;
  },

  /**
   * Supprimer une variante spécifique d'une carte
   */
  async deleteVariant(itemId: string, variantIndex: number): Promise<PortfolioCard | null> {
    const response = await api.delete<PortfolioCard>(
      `/portfolio/cards/${itemId}/variants/${variantIndex}`
    );
    return response.data;
  },

  /**
   * Toggle le statut favori d'une carte
   */
  async toggleFavorite(itemId: string): Promise<PortfolioCard> {
    const response = await api.patch<PortfolioCard>(`/portfolio/cards/${itemId}/favorite`);
    return response.data;
  },
};
