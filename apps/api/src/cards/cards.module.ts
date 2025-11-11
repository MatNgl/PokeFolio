import { Module } from '@nestjs/common';

import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { TcgdexService } from './tcgdex.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, TcgdexService],
  exports: [CardsService],
})
export class CardsModule {}
