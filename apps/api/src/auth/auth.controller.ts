import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response, CookieOptions } from 'express';

import { AuthService } from './auth.service';
import type { AuthResult } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { JwtUser } from './types/jwt-user.type';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService
  ) {
    this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
  }

  private buildCookieOptions(remember: boolean | undefined): CookieOptions {
    const base: CookieOptions = {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
      path: '/',
    };
    return remember ? { ...base, maxAge: 100 * 24 * 60 * 60 * 1000 } : base; // ~100 jours
  }

  private setAuthCookie(res: Response, accessToken: string, remember?: boolean): void {
    res.cookie('access_token', accessToken, this.buildCookieOptions(remember));
  }

  private clearAuthCookie(res: Response): void {
    // mêmes options clés pour être sûr de supprimer le bon cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
      path: '/',
    });
  }

  @Post('register')
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @ApiResponse({ status: 400, description: 'Validation échouée' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResult> {
    const result = await this.authService.register(dto);
    // Cookie de session par défaut à l'inscription
    this.setAuthCookie(res, result.accessToken, false);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion d'un utilisateur" })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResult> {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.accessToken, dto.rememberMe === true);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiResponse({ status: 204, description: 'Déconnexion réussie' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async logout(
    @CurrentUser() _user: JwtUser,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    this.clearAuthCookie(res);
    return;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Récupérer le profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getMe(@CurrentUser() user: JwtUser) {
    const userDoc = await this.usersService.findById(user.sub);
    if (!userDoc) throw new UnauthorizedException('Utilisateur introuvable');
    return this.usersService.toUserResponse(userDoc);
  }
}
