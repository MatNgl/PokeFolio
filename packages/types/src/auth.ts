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

// Plus d'AuthTokens avec refresh — on simplifie
export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
  // Peut rester si tu l'utilises côté UI, mais ignoré côté API
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
