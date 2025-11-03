// apps/api/src/cards/cards.controller.ts
import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { SearchCardsDto } from './dto/search-cards.dto';
import { type Card, type CardSearchResult, type CardLanguage } from '@pokefolio/types';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOkResponse({ description: 'Résultats de recherche de cartes' })
  async search(@Query() dto: SearchCardsDto): Promise<CardSearchResult> {
    return this.cardsService.searchCards(dto);
  }

  @Get(':id')
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'en', 'ja', 'zh'], example: 'fr' })
  @ApiOkResponse({ description: 'Détail carte' })
  async getById(@Param('id') id: string, @Query('lang') lang?: CardLanguage): Promise<Card | null> {
    return this.cardsService.getCardById(id, lang ?? 'fr');
  }
}
