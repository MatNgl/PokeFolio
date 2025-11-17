/**
 * Types pour le dashboard - miroir strict des DTOs backend
 */

// ────────────────────────────────────────────────────────────
// Period Filter
// ────────────────────────────────────────────────────────────

export enum PeriodType {
  ALL = 'all',
  YEAR = 'year',
  MONTH = 'month',
  WEEK = 'week',
}

export interface PeriodFilter {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  type?: PeriodType;
  year?: number;
  month?: number; // 1-12
  week?: number; // 1-4
}

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalCards: number;
  distinctCards: number;
  totalSets: number;
  totalValue: number;
  gradedCount: number;
  calculatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Time Series
// ────────────────────────────────────────────────────────────

export enum TimeSeriesMetric {
  COUNT = 'count',
  VALUE = 'value',
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
  period: PeriodFilter;
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

// ────────────────────────────────────────────────────────────
// Expensive Cards
// ────────────────────────────────────────────────────────────

export interface ExpensiveCardItem {
  itemId: string;
  cardId: string;
  cardName?: string;
  imageUrl?: string;
  price: number;
  isGraded: boolean;
  gradeCompany?: string;
  gradeScore?: string;
  setName?: string;
}

export interface ExpensiveCards {
  cards: ExpensiveCardItem[];
}
