import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { type JwtPayload } from '@pokefolio/types';

import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.['refreshToken'];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    return user;
  }
}
