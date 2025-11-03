/**
 * Time interval for stats aggregation
 */
export type StatsInterval = 'day' | 'week' | 'month' | 'year';

/**
 * Stats data point
 */
export interface StatsDataPoint {
  date: string;
  quantity: number;
  costCents: number;
  distinctCards: number;
}

/**
 * Stats query params
 */
export interface StatsQuery {
  interval?: StatsInterval;
  from?: string;
  to?: string;
}

/**
 * Stats response
 */
export interface StatsResponse {
  interval: StatsInterval;
  data: StatsDataPoint[];
  summary: {
    totalQuantity: number;
    totalCostCents: number;
    avgPriceCents: number;
    distinctCards: number;
  };
}

/**
 * Portfolio history entry
 */
export interface PortfolioHistoryEntry {
  id: string;
  ownerId: string;
  action: 'add' | 'update' | 'delete';
  itemId: string;
  cardName?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}
