import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './service/portfolio.service';
import { PortfolioItem, PortfolioItemSchema } from './schemas/portfolio-item.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PortfolioItem.name, schema: PortfolioItemSchema }])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
