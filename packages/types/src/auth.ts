import { type UserRole } from './common';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Registration request
 */
export interface RegisterDto {
  email: string;
  password: string;
}

/**
 * Login request
 */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Auth tokens response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

/**
 * JWT payload
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
