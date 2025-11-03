// packages/types/src/user.ts
export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  pseudo: string;
  role: UserRole;
}
