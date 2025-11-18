import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PortfolioService } from './service/portfolio.service';
import { CreatePortfolioItemApiDto } from './dto/create-portfolio-item-api.dto';
import { UpdatePortfolioItemApiDto } from './dto/update-portfolio-item-api.dto';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

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

  @UseGuards(JwtAuthGuard)
  @Post('cards')
  @ApiOperation({ summary: 'Ajouter une carte au portfolio (prix en euros)' })
  @ApiResponse({ status: 201, description: 'Carte ajoutée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePortfolioItemApiDto) {
    const ownerId = getOwnerId(req);
    // Passer aussi les métadonnées de la carte au service
    return this.service.create(ownerId, {
      ...dto.toCreateDto(),
      name: dto.name,
      setId: dto.setId,
      setName: dto.setName,
      setLogo: dto.setLogo,
      setSymbol: dto.setSymbol,
      setReleaseDate: dto.setReleaseDate,
      number: dto.number,
      setCardCount: dto.setCardCount,
      rarity: dto.rarity,
      imageUrl: dto.imageUrl,
      imageUrlHiRes: dto.imageUrlHiRes,
      types: dto.types,
      supertype: dto.supertype,
      subtypes: dto.subtypes,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('cards')
  findAll(@Req() req: AuthenticatedRequest, @Query('cardId') cardId?: string) {
    const ownerId = getOwnerId(req);
    return this.service.findAll(ownerId, { cardId });
  }

  @UseGuards(JwtAuthGuard)
  @Get('cards/:id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const ownerId = getOwnerId(req);
    return this.service.findOne(ownerId, id);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Delete('cards/:id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const ownerId = getOwnerId(req);
    return this.service.remove(ownerId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  stats(@Req() req: AuthenticatedRequest) {
    const ownerId = getOwnerId(req);
    return this.service.stats(ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sets')
  @ApiOperation({ summary: 'Récupérer les cartes groupées par set' })
  @ApiResponse({ status: 200, description: 'Sets récupérés avec succès' })
  getSets(@Req() req: AuthenticatedRequest) {
    const ownerId = getOwnerId(req);
    return this.service.getSetsByUser(ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-ownership')
  @ApiOperation({ summary: 'Vérifier la possession de cartes' })
  @ApiResponse({ status: 200, description: 'Vérification effectuée' })
  checkOwnership(@Req() req: AuthenticatedRequest, @Body() body: { cardIds: string[] }) {
    const ownerId = getOwnerId(req);
    return this.service.checkOwnership(ownerId, body.cardIds);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cards/:id/variants/:variantIndex')
  @ApiOperation({ summary: 'Supprimer une variante spécifique' })
  @ApiResponse({ status: 200, description: 'Variante supprimée avec succès' })
  @ApiResponse({ status: 204, description: "Item supprimé (c'était la dernière variante)" })
  @ApiResponse({ status: 404, description: 'Item non trouvé' })
  async deleteVariant(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('variantIndex') variantIndexStr: string
  ) {
    const ownerId = getOwnerId(req);
    const variantIndex = parseInt(variantIndexStr, 10);

    if (isNaN(variantIndex)) {
      throw new BadRequestException('Index de variante invalide');
    }

    const result = await this.service.deleteVariant(ownerId, id, variantIndex);

    // Si result est null, l'item a été supprimé (c'était la dernière variante)
    if (result === null) {
      return { deleted: true, message: 'Item supprimé (dernière variante)' };
    }

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cards/:id/favorite')
  @ApiOperation({ summary: "Toggle le statut favori d'une carte" })
  @ApiResponse({ status: 200, description: 'Statut favori mis à jour' })
  @ApiResponse({ status: 404, description: 'Carte non trouvée' })
  async toggleFavorite(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const ownerId = getOwnerId(req);
    return this.service.toggleFavorite(ownerId, id);
  }
}
