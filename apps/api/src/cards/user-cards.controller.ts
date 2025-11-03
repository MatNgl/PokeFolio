import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserCardsService } from './user-cards.service';
import { AddCardDto } from './dto/add-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@ApiTags('portfolio')
@Controller('portfolio')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserCardsController {
  constructor(private readonly userCardsService: UserCardsService) {}

  @Post('cards')
  @ApiOperation({ summary: 'Ajouter une carte au portfolio' })
  @ApiResponse({ status: 201, description: 'Carte ajoutée avec succès' })
  async addCard(@Request() req: { user: { sub: string } }, @Body() dto: AddCardDto) {
    return this.userCardsService.addCard(req.user.sub, dto);
  }

  @Get('cards')
  @ApiOperation({ summary: 'Obtenir toutes les cartes du portfolio' })
  @ApiResponse({ status: 200, description: 'Liste des cartes' })
  async getCards(@Request() req: { user: { sub: string } }) {
    return this.userCardsService.getUserCards(req.user.sub);
  }

  @Get('cards/:id')
  @ApiOperation({ summary: 'Obtenir une carte spécifique' })
  @ApiResponse({ status: 200, description: 'Détails de la carte' })
  @ApiResponse({ status: 404, description: 'Carte non trouvée' })
  async getCard(@Request() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.userCardsService.getCardById(req.user.sub, id);
  }

  @Put('cards/:id')
  @ApiOperation({ summary: 'Mettre à jour une carte' })
  @ApiResponse({ status: 200, description: 'Carte mise à jour' })
  @ApiResponse({ status: 404, description: 'Carte non trouvée' })
  async updateCard(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCardDto
  ) {
    return this.userCardsService.updateCard(req.user.sub, id, dto);
  }

  @Delete('cards/:id')
  @ApiOperation({ summary: 'Supprimer une carte' })
  @ApiResponse({ status: 200, description: 'Carte supprimée' })
  @ApiResponse({ status: 404, description: 'Carte non trouvée' })
  async deleteCard(@Request() req: { user: { sub: string } }, @Param('id') id: string) {
    await this.userCardsService.deleteCard(req.user.sub, id);
    return { message: 'Carte supprimée avec succès' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtenir les statistiques du portfolio' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStats(@Request() req: { user: { sub: string } }) {
    return this.userCardsService.getStats(req.user.sub);
  }
}
