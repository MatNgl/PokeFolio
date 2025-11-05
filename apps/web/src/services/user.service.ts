import { api } from './api';
import type { AuthUser } from '@pokefolio/types';

export interface UpdatePseudoPayload {
  pseudo: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePseudoResponse {
  success: boolean;
  user: AuthUser;
}

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
}

export interface ClearPortfolioResponse {
  success: boolean;
  deletedCount: number;
  message: string;
}

export const userService = {
  /**
   * Met à jour le pseudo de l'utilisateur
   */
  async updatePseudo(data: UpdatePseudoPayload): Promise<UpdatePseudoResponse> {
    const response = await api.put<UpdatePseudoResponse>('/users/profile/pseudo', data);
    return response.data;
  },

  /**
   * Met à jour le mot de passe de l'utilisateur
   */
  async updatePassword(data: UpdatePasswordPayload): Promise<UpdatePasswordResponse> {
    const response = await api.put<UpdatePasswordResponse>('/users/profile/password', data);
    return response.data;
  },

  /**
   * Vide le portfolio de l'utilisateur
   */
  async clearPortfolio(): Promise<ClearPortfolioResponse> {
    const response = await api.delete<ClearPortfolioResponse>('/users/profile/portfolio');
    return response.data;
  },
};
