import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type JwtPayload, type LoginResponse, type AuthTokens } from '@pokefolio/types';

import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { CryptoService } from './crypto.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
    const user = await this.usersService.create(dto.email, passwordHash);

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken as string);

    return {
      user: this.usersService.toUserResponse(user),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await this.cryptoService.verifyPassword(
      user.passwordHash,
      dto.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(user, dto.rememberMe);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken as string);

    return {
      user: this.usersService.toUserResponse(user),
      tokens,
    };
  }

  async refresh(user: User): Promise<AuthTokens> {
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken as string);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(user: User, rememberMe = false): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    let refreshToken: string | undefined;

    if (rememberMe) {
      refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      });
    }

    return { accessToken, refreshToken };
  }
}
