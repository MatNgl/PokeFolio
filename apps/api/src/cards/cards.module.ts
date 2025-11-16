import { Module } from '@nestjs/common';

import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { TcgdexService } from './tcgdex.service';
import { PokemonTCGPricingService } from './pokemon-tcg-pricing.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, TcgdexService, PokemonTCGPricingService],
  exports: [CardsService, PokemonTCGPricingService],
})
export class CardsModule {}
