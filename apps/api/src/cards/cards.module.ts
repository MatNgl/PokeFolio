// apps/api/src/cards/cards.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CardsController } from './cards.controller';
import { UserCardsController } from './user-cards.controller';
import { CardsService } from './cards.service';
import { UserCardsService } from './user-cards.service';
import { TcgdexService } from './tcgdex.service';
import { CardCache, CardCacheSchema } from './schemas/card-cache.schema';
import { UserCard, UserCardSchema } from './schemas/user-card.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CardCache.name, schema: CardCacheSchema },
      { name: UserCard.name, schema: UserCardSchema },
    ]),
  ],
  controllers: [CardsController, UserCardsController],
  providers: [CardsService, UserCardsService, TcgdexService],
  exports: [CardsService, UserCardsService],
})
export class CardsModule {}
