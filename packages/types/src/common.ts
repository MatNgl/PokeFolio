/**
 * Supported card languages
 */
export type CardLanguage = 'fr' | 'en' | 'ja' | 'zh';

/**
 * Currency (EUR only, stored in cents)
 */
export type Currency = 'EUR';

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API Error response
 */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}

/**
 * Success response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Re-export shared roles & user types to avoid duplication
 */
export type { UserRole } from './user';
