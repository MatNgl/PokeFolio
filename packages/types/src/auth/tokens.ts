// packages/types/src/auth/tokens.ts
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string; // présent si rememberMe / inscription
}
