// packages/types/src/auth/login.response.ts
import type { AuthUser } from '../user';
import type { AuthTokens } from './tokens';

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
