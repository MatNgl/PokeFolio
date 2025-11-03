// packages/types/src/auth.ts

import type { UserRole } from './user';

/** --- Tokens --- */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/** --- JWT Payload --- */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

/** --- Login DTO --- */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** --- Register DTO --- */
export interface RegisterDto {
  email: string;
  pseudo: string;
  password: string;
  confirmPassword: string;
}

/** --- Login / Register Response --- */
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    pseudo: string;
    role: UserRole;
  };
  tokens: AuthTokens;
}
