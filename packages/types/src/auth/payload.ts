// packages/types/src/auth/payload.ts
import type { UserRole } from '../user';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}
