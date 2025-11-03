import { Controller, Post, Get, Body, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('register')
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @ApiResponse({ status: 400, description: 'Validation échouée' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);

    if (result.tokens.refreshToken) {
      this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    }

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion d'un utilisateur" })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    if (result.tokens.refreshToken) {
      this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    }

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: "Renouveler l'access token" })
  @ApiResponse({ status: 200, description: 'Token renouvelé' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async refresh(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(user);

    if (tokens.refreshToken) {
      this.setRefreshTokenCookie(res, tokens.refreshToken);
    }

    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiResponse({ status: 204, description: 'Déconnexion réussie' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async logout(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    this.clearRefreshTokenCookie(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Récupérer le profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getMe(@CurrentUser() user: User) {
    return this.usersService.toUserResponse(user);
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
