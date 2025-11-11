import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  PortfolioItem,
  PortfolioItemSchema,
} from '../modules/portfolio/schemas/portfolio-item.schema';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PortfolioItem.name, schema: PortfolioItemSchema },
    ]),
    ActivityLogsModule,
    CardsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
