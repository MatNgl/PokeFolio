import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type JwtFromRequestFunction } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { JwtUser } from '../types/jwt-user.type';
import type { UserRole } from '@pokefolio/types';

type JwtPayload = {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

const cookieExtractor: JwtFromRequestFunction = (req: Request): string | null => {
  const token = req?.cookies?.access_token;
  return typeof token === 'string' ? token : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtUser {
    // On renvoie le "JwtUser" attendu par @CurrentUser()
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
