import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserCard, UserCardSchema } from '../cards/schemas/user-card.schema';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserCard.name, schema: UserCardSchema },
    ]),
    ActivityLogsModule,
    CardsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
