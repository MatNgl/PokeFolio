import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  PortfolioItem,
  PortfolioItemSchema,
} from '../modules/portfolio/schemas/portfolio-item.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PortfolioItem.name, schema: PortfolioItemSchema }])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
