import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PortfolioService } from './service/portfolio.service';
import { CreatePortfolioItemApiDto } from './dto/create-portfolio-item-api.dto';
import { UpdatePortfolioItemApiDto } from './dto/update-portfolio-item-api.dto';
import type { Request } from 'express';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // décommente si tu as un guard JWT

type UserLike = {
  sub?: string;
  id?: string;
  _id?: string;
};

interface AuthenticatedRequest extends Request {
  user?: UserLike;
}

function getOwnerId(req: AuthenticatedRequest): string {
  const u = req.user;
  const ownerId = u?.sub ?? u?.id ?? u?._id;
  if (!ownerId) {
    // Si tu veux tolérer un mode démo, remplace par un fallback string ici.
    throw new UnauthorizedException('Utilisateur non authentifié');
  }
  return String(ownerId);
}

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  // @UseGuards(JwtAuthGuard)
  @Post('cards')
  @ApiOperation({ summary: 'Ajouter une carte au portfolio (prix en euros)' })
  @ApiResponse({ status: 201, description: 'Carte ajoutée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePortfolioItemApiDto) {
    const ownerId = getOwnerId(req);
    // Conversion euros → cents avant passage au service
    const serviceDto = dto.toCreateDto();
    return this.service.create(ownerId, serviceDto);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('cards')
  findAll(@Req() req: AuthenticatedRequest, @Query('cardId') cardId?: string) {
    const ownerId = getOwnerId(req);
    return this.service.findAll(ownerId, { cardId });
  }

  // @UseGuards(JwtAuthGuard)
  @Get('cards/:id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const ownerId = getOwnerId(req);
    return this.service.findOne(ownerId, id);
  }

  // @UseGuards(JwtAuthGuard)
  @Put('cards/:id')
  @ApiOperation({ summary: 'Mettre à jour une carte du portfolio (prix en euros)' })
  @ApiResponse({ status: 200, description: 'Carte mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Carte non trouvée' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioItemApiDto
  ) {
    const ownerId = getOwnerId(req);
    // Conversion euros → cents avant passage au service
    const serviceDto = dto.toUpdateDto();
    return this.service.update(ownerId, id, serviceDto);
  }

  // @UseGuards(JwtAuthGuard)
  @Delete('cards/:id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const ownerId = getOwnerId(req);
    return this.service.remove(ownerId, id);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('stats')
  stats(@Req() req: AuthenticatedRequest) {
    const ownerId = getOwnerId(req);
    return this.service.stats(ownerId);
  }
}
