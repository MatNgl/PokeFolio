import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserCard } from './schemas/user-card.schema';
import { AddCardDto } from './dto/add-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class UserCardsService {
  constructor(
    @InjectModel(UserCard.name)
    private readonly userCardModel: Model<UserCard>
  ) {}

  async addCard(userId: string, dto: AddCardDto): Promise<UserCard> {
    const card = new this.userCardModel({
      userId: new Types.ObjectId(userId),
      ...dto,
    });
    return card.save();
  }

  async getUserCards(userId: string): Promise<UserCard[]> {
    return this.userCardModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getCardById(userId: string, cardId: string): Promise<UserCard> {
    const card = await this.userCardModel.findOne({
      _id: cardId,
      userId: new Types.ObjectId(userId),
    });

    if (!card) {
      throw new NotFoundException('Carte non trouvée');
    }

    return card;
  }

  async updateCard(userId: string, cardId: string, dto: UpdateCardDto): Promise<UserCard> {
    const card = await this.userCardModel.findOneAndUpdate(
      {
        _id: cardId,
        userId: new Types.ObjectId(userId),
      },
      { $set: dto },
      { new: true }
    );

    if (!card) {
      throw new NotFoundException('Carte non trouvée');
    }

    return card;
  }

  async deleteCard(userId: string, cardId: string): Promise<void> {
    const result = await this.userCardModel.deleteOne({
      _id: cardId,
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Carte non trouvée');
    }
  }

  async getStats(userId: string) {
    const cards = await this.userCardModel.find({ userId: new Types.ObjectId(userId) });

    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = cards.length;
    const totalValue = cards.reduce(
      (sum, card) => sum + (card.currentValue || 0) * card.quantity,
      0
    );
    const totalCost = cards.reduce(
      (sum, card) => sum + (card.purchasePrice || 0) * card.quantity,
      0
    );
    const gradedCards = cards.filter((card) => card.isGraded).length;

    return {
      totalCards,
      uniqueCards,
      totalValue,
      totalCost,
      gradedCards,
      profit: totalValue - totalCost,
    };
  }
}
