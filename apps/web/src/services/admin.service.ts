import { api } from './api';

export interface GlobalStats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalCards: number;
  newCardsThisWeek: number;
  totalValue: number;
}

export interface TopCard {
  cardId: string;
  name: string;
  setName: string;
  imageUrl?: string;
  totalQuantity: number;
  ownersCount: number;
}

export interface TopUser {
  userId: string;
  email: string;
  pseudo: string;
  totalValue: number;
  cardsCount: number;
}

export interface ChartData {
  newUsersByDay: { date: string; count: number }[];
  newCardsByDay: { date: string; count: number }[];
}

export interface SetDistribution {
  setName: string;
  cardsCount: number;
  uniqueCards: number;
}

export interface UserWithStats {
  _id: string;
  email: string;
  pseudo: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  cardsCount: number;
  totalValue: number;
}

export interface UserCard {
  _id: string;
  cardId: string;
  name: string;
  setName?: string;
  imageUrl?: string;
  quantity: number;
  purchasePrice?: number;
  purchaseDate?: string;
  graded?: boolean;
  grading?: {
    company?: string;
    grade?: string;
    certificationNumber?: string;
  };
  notes?: string;
  language?: string;
}

export interface UserDetails {
  user: {
    _id: string;
    email: string;
    pseudo: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  cards: UserCard[];
  stats: {
    cardsCount: number;
    totalValue: number;
  };
}

export interface ActivityLog {
  _id: string;
  userId: string;
  userEmail: string;
  type: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export const adminService = {
  async getGlobalStats(): Promise<GlobalStats> {
    const response = await api.get<GlobalStats>('/admin/stats');
    return response.data;
  },

  async getTopCards(limit = 10): Promise<TopCard[]> {
    const response = await api.get<TopCard[]>(`/admin/stats/top-cards?limit=${limit}`);
    return response.data;
  },

  async getTopUsers(limit = 10): Promise<TopUser[]> {
    const response = await api.get<TopUser[]>(`/admin/stats/top-users?limit=${limit}`);
    return response.data;
  },

  async getChartsData(days = 30): Promise<ChartData> {
    const response = await api.get<ChartData>(`/admin/stats/charts?days=${days}`);
    return response.data;
  },

  async getSetDistribution(limit = 20): Promise<SetDistribution[]> {
    const response = await api.get<SetDistribution[]>(`/admin/stats/sets?limit=${limit}`);
    return response.data;
  },

  async getAllUsers(): Promise<UserWithStats[]> {
    const response = await api.get<UserWithStats[]>('/admin/users');
    return response.data;
  },

  async getUserDetails(userId: string): Promise<UserDetails> {
    const response = await api.get<UserDetails>(`/admin/users/${userId}`);
    return response.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async deleteUserCard(userId: string, cardId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}/cards/${cardId}`);
  },

  async getActivityLogs(params?: {
    limit?: number;
    skip?: number;
    userId?: string;
    type?: string;
  }): Promise<{ logs: ActivityLog[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.skip) query.append('skip', params.skip.toString());
    if (params?.userId) query.append('userId', params.userId);
    if (params?.type) query.append('type', params.type);

    const response = await api.get<{ logs: ActivityLog[]; total: number }>(
      `/admin/logs?${query.toString()}`
    );
    return response.data;
  },
};
