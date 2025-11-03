// Auth types
export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  pseudo: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDto {
  email: string;
  pseudo: string;
  password: string;
  confirmPassword: string;
}

export interface User extends AuthUser {
  createdAt: Date;
  updatedAt: Date;
}

// Card types
export * from './card.types';
