/**
 * Types pour le dashboard - miroir strict des DTOs backend
 */

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

export interface MetricChange {
  value: number;
  percentChange: number;
  previousValue: number;
}

export interface DashboardSummary {
  totalCards: MetricChange;
  totalSets: MetricChange;
  totalValue: MetricChange;
  gradedCount: MetricChange;
  calculatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Time Series
// ────────────────────────────────────────────────────────────

export enum TimeSeriesMetric {
  COUNT = 'count',
  VALUE = 'value',
}

export enum TimeSeriesPeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  SIX_MONTHS = '6m',
  ONE_YEAR = '1y',
  ALL = 'all',
}

export enum TimeSeriesBucket {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface TimeSeriesData {
  metric: TimeSeriesMetric;
  period: TimeSeriesPeriod;
  bucket: TimeSeriesBucket;
  data: TimeSeriesDataPoint[];
}

// ────────────────────────────────────────────────────────────
// Grade Distribution
// ────────────────────────────────────────────────────────────

export interface GradeCompanyDistribution {
  company: string;
  count: number;
  percentage: number;
}

export interface GradeDistribution {
  graded: number;
  normal: number;
  total: number;
  gradedPercentage: number;
  byCompany: GradeCompanyDistribution[];
}

// ────────────────────────────────────────────────────────────
// Top Sets
// ────────────────────────────────────────────────────────────

export interface TopSetItem {
  setId: string;
  setName: string;
  cardCount: number;
  totalValue: number;
}

export interface TopSets {
  sets: TopSetItem[];
  totalSets: number;
}

// ────────────────────────────────────────────────────────────
// Recent Activity
// ────────────────────────────────────────────────────────────

export enum ActivityType {
  ADDED = 'added',
  UPDATED = 'updated',
}

export interface RecentActivityItem {
  itemId: string;
  cardId: string;
  cardName?: string;
  imageUrl?: string;
  type: ActivityType;
  date: string;
  quantity: number;
  isGraded: boolean;
}

export interface RecentActivity {
  activities: RecentActivityItem[];
}
