import { type RegisterDto, type LoginDto } from '@pokefolio/types';
import type { AuthUser } from '@pokefolio/types';

import { api } from './api';

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
export const authService = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data;
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
  },

  async getMe(): Promise<AuthUser> {
    const response = await api.get<AuthUser>('/auth/me', { withCredentials: true });
    return response.data;
  },
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};
