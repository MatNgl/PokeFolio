import type { UserRole } from '@pokefolio/types';

export interface JwtUser {
  sub: string; // userId
  email: string;
  role: UserRole;
}
