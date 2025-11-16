import { api } from './api';

export interface WishlistItem {
  id: string;
  cardId: string;
  name?: string;
  setId?: string;
  setName?: string;
  setLogo?: string;
  setSymbol?: string;
  releaseDate?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  targetPrice?: number;
  notes?: string;
  createdAt: string;
}

export interface AddToWishlistDto {
  cardId: string;
  name?: string;
  setId?: string;
  setName?: string;
  setLogo?: string;
  setSymbol?: string;
  setReleaseDate?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  targetPrice?: number;
  notes?: string;
}

export interface UpdateWishlistItemDto {
  priority?: 'low' | 'medium' | 'high';
  targetPrice?: number;
  notes?: string;
}

export const wishlistService = {
  /**
   * Récupérer la wishlist de l'utilisateur
   */
  async getWishlist(): Promise<{ items: WishlistItem[]; total: number }> {
    const response = await api.get<{ items: WishlistItem[]; total: number }>('/wishlist');
    return response.data;
  },

  /**
   * Ajouter une carte à la wishlist
   */
  async addToWishlist(data: AddToWishlistDto): Promise<WishlistItem> {
    const response = await api.post<WishlistItem>('/wishlist', data);
    return response.data;
  },

  /**
   * Retirer une carte de la wishlist
   */
  async removeFromWishlist(cardId: string): Promise<void> {
    await api.delete(`/wishlist/${cardId}`);
  },

  /**
   * Vérifier si une carte est dans la wishlist
   */
  async isInWishlist(cardId: string): Promise<boolean> {
    const response = await api.get<{ inWishlist: boolean }>(`/wishlist/check/${cardId}`);
    return response.data.inWishlist;
  },

  /**
   * Vérifier plusieurs cartes en une fois
   */
  async checkMultiple(cardIds: string[]): Promise<Record<string, boolean>> {
    const response = await api.post<Record<string, boolean>>('/wishlist/check-multiple', {
      cardIds,
    });
    return response.data;
  },

  /**
   * Mettre à jour une carte de la wishlist
   */
  async updateItem(cardId: string, data: UpdateWishlistItemDto): Promise<WishlistItem> {
    const response = await api.put<WishlistItem>(`/wishlist/${cardId}`, data);
    return response.data;
  },
};
