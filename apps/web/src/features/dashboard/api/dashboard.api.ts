import { api } from '@/services/api';
import type {
  DashboardSummary,
  TimeSeriesData,
  TimeSeriesMetric,
  TimeSeriesBucket,
  PeriodFilter,
  GradeDistribution,
  TopSets,
  RecentActivity,
  ExpensiveCards,
} from '../types/dashboard.types';

/**
 * API client pour les endpoints dashboard
 * Tous les appels sont strictement typés
 */

export const dashboardApi = {
  /**
   * Récupère le résumé des KPIs pour une période donnée
   */
  async getSummary(periodFilter: PeriodFilter): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary', {
      params: periodFilter,
    });
    return data;
  },

  /**
   * Récupère les données de série temporelle
   */
  async getTimeSeries(
    metric: TimeSeriesMetric,
    periodFilter: PeriodFilter,
    bucket: TimeSeriesBucket
  ): Promise<TimeSeriesData> {
    const { data } = await api.get<TimeSeriesData>('/dashboard/timeseries', {
      params: { metric, ...periodFilter, bucket },
    });
    return data;
  },

  /**
   * Récupère la distribution gradé vs normal
   */
  async getGradeDistribution(): Promise<GradeDistribution> {
    const { data } = await api.get<GradeDistribution>('/dashboard/grade-distribution');
    return data;
  },

  /**
   * Récupère le top des sets
   */
  async getTopSets(limit: number = 5): Promise<TopSets> {
    const { data } = await api.get<TopSets>('/dashboard/top-sets', {
      params: { limit },
    });
    return data;
  },

  /**
   * Récupère l'activité récente
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity> {
    const { data } = await api.get<RecentActivity>('/dashboard/recent-activity', {
      params: { limit },
    });
    return data;
  },

  /**
   * Récupère les cartes les plus chères
   */
  async getExpensiveCards(limit: number = 5): Promise<ExpensiveCards> {
    const { data } = await api.get<ExpensiveCards>('/dashboard/expensive-cards', {
      params: { limit },
    });
    return data;
  },
};
