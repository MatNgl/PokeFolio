import {
  Body,
  Controller,
  Put,
  Delete,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { PortfolioService } from '../modules/portfolio/service/portfolio.service';
import { CryptoService } from '../auth/crypto.service';

interface UpdatePseudoDto {
  pseudo: string;
}

interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly portfolioService: PortfolioService,
    private readonly cryptoService: CryptoService
  ) {}

  private getUserIdFromRequest(req: Request): string {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return userId;
  }

  @Put('profile/pseudo')
  @ApiOperation({ summary: 'Update user pseudo' })
  @ApiResponse({ status: 200, description: 'Pseudo updated successfully' })
  async updatePseudo(@Req() req: Request, @Body() body: UpdatePseudoDto) {
    const userId = this.getUserIdFromRequest(req);

    if (!body.pseudo || body.pseudo.trim().length < 2) {
      throw new BadRequestException('Pseudo must be at least 2 characters long');
    }

    // Vérifier si le pseudo est déjà utilisé
    const existing = await this.usersService.findByPseudo(body.pseudo);
    if (existing && existing.id !== userId) {
      throw new BadRequestException('This pseudo is already taken');
    }

    const updatedUser = await this.usersService.updatePseudo(userId, body.pseudo);
    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }

    return {
      success: true,
      user: this.usersService.toUserResponse(updatedUser),
    };
  }

  @Put('profile/password')
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async updatePassword(@Req() req: Request, @Body() body: UpdatePasswordDto) {
    const userId = this.getUserIdFromRequest(req);

    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Current and new passwords are required');
    }

    if (body.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    // Vérifier le mot de passe actuel
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await this.cryptoService.verifyPassword(
      user.passwordHash,
      body.currentPassword
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await this.cryptoService.hashPassword(body.newPassword);
    await this.usersService.updatePassword(userId, newPasswordHash);

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  @Delete('profile/portfolio')
  @ApiOperation({ summary: 'Clear user portfolio' })
  @ApiResponse({ status: 200, description: 'Portfolio cleared successfully' })
  async clearPortfolio(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    const result = await this.portfolioService.clearPortfolio(userId);

    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} card(s) deleted from your portfolio`,
    };
  }
}
