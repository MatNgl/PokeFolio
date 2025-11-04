import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { TcgdexService } from './tcgdex.service';

import { UserCardsService } from './user-cards.service';
import { UserCardsController } from './user-cards.controller';

import { UserCard, UserCardSchema } from './schemas/user-card.schema';
import { CardCache, CardCacheSchema } from './schemas/card-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserCard.name, schema: UserCardSchema },
      { name: CardCache.name, schema: CardCacheSchema },
    ]),
  ],
  controllers: [CardsController, UserCardsController],
  providers: [CardsService, TcgdexService, UserCardsService],
  exports: [CardsService, UserCardsService],
})
export class CardsModule {}
