// apps/api/src/cards/cards.controller.ts
import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { PokemonTCGPricingService } from './pokemon-tcg-pricing.service';
import { SearchCardsDto } from './dto/search-cards.dto';
import {
  type Card,
  type CardSearchResult,
  type CardLanguage,
  type CardPricing,
  type PriceHistory,
} from '@pokefolio/types';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly pricingService: PokemonTCGPricingService
  ) {}

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

  @Get(':id/pricing')
  @ApiOkResponse({ description: 'Prix actuels de la carte' })
  async getCardPricing(@Param('id') id: string): Promise<CardPricing | null> {
    return this.pricingService.getCardPricing(id);
  }

  @Get(':id/price-history')
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  @ApiQuery({
    name: 'variant',
    required: false,
    enum: ['normal', 'holofoil', 'reverseHolofoil'],
    example: 'normal',
  })
  @ApiOkResponse({ description: "Historique des prix d'une carte" })
  async getPriceHistory(
    @Param('id') id: string,
    @Query('period') period?: '7d' | '30d' | '90d' | '1y',
    @Query('variant') variant?: 'normal' | 'holofoil' | 'reverseHolofoil'
  ): Promise<PriceHistory | null> {
    return this.pricingService.getPriceHistory(id, period ?? '30d', variant ?? 'normal');
  }
}
