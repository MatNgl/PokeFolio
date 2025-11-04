import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, Model, FilterQuery, UpdateQuery } from 'mongoose';
import { UserCard } from './schemas/user-card.schema';
import { AddCardDto } from './dto/add-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class UserCardsService {
  constructor(
    @InjectModel(UserCard.name)
    private readonly userCardModel: Model<UserCard>
  ) {}

  // Ajout : si même carte + même config de gradation => on incrémente quantity
  async addCard(userIdStr: string, dto: AddCardDto) {
    const userId = new Types.ObjectId(userIdStr);

    const normalizedPurchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : undefined;

    // Filtre de correspondance (unicité logique)
    const match: FilterQuery<UserCard> = {
      userId,
      cardId: dto.cardId,
      isGraded: !!dto.isGraded,
      // on garde undefined si non fourni pour ne pas forcer "null"
      gradeCompany: dto.gradeCompany ?? undefined,
      gradeScore: dto.gradeScore ?? undefined,
    };

    // Mise à jour / insertion typée
    const update: UpdateQuery<UserCard> = {
      $setOnInsert: {
        userId,
        cardId: dto.cardId,
        name: dto.name,
        setId: dto.setId,
        setName: dto.setName,
        number: dto.number,
        setCardCount: dto.setCardCount,
        rarity: dto.rarity,
        imageUrl: dto.imageUrl,
        imageUrlHiRes: dto.imageUrlHiRes,
        types: dto.types,
        supertype: dto.supertype,
        subtypes: dto.subtypes,
        isGraded: !!dto.isGraded,
        gradeCompany: dto.gradeCompany,
        gradeScore: dto.gradeScore,
        purchasePrice: dto.purchasePrice,
        purchaseDate: normalizedPurchaseDate,
        currentValue: dto.currentValue,
        notes: dto.notes,
        // quantity sera gérée via $inc ci-dessous
      },
      $inc: {
        quantity: Math.max(1, dto.quantity ?? 1),
      },
    };

    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    };

    const doc = await this.userCardModel.findOneAndUpdate(match, update, options);
    return doc;
  }

  async getUserCards(userIdStr: string) {
    const userId = new Types.ObjectId(userIdStr);
    return this.userCardModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
  }

  async getCardById(userIdStr: string, id: string) {
    const userId = new Types.ObjectId(userIdStr);
    const card = await this.userCardModel.findOne({ _id: id, userId }).lean().exec();
    if (!card) throw new NotFoundException('Carte non trouvée');
    return card;
  }

  async updateCard(userIdStr: string, id: string, dto: UpdateCardDto) {
    const userId = new Types.ObjectId(userIdStr);

    const setPayload: Partial<
      Pick<
        UserCard,
        | 'quantity'
        | 'isGraded'
        | 'gradeCompany'
        | 'gradeScore'
        | 'purchasePrice'
        | 'purchaseDate'
        | 'currentValue'
        | 'notes'
      >
    > = {};

    if (dto.quantity !== undefined) setPayload.quantity = dto.quantity;
    if (dto.isGraded !== undefined) setPayload.isGraded = dto.isGraded;
    if (dto.gradeCompany !== undefined) setPayload.gradeCompany = dto.gradeCompany;
    if (dto.gradeScore !== undefined) setPayload.gradeScore = dto.gradeScore;
    if (dto.purchasePrice !== undefined) setPayload.purchasePrice = dto.purchasePrice;
    if (dto.purchaseDate !== undefined) setPayload.purchaseDate = new Date(dto.purchaseDate);
    if (dto.currentValue !== undefined) setPayload.currentValue = dto.currentValue;
    if (dto.notes !== undefined) setPayload.notes = dto.notes;

    const update: UpdateQuery<UserCard> = { $set: setPayload };

    const updated = await this.userCardModel
      .findOneAndUpdate({ _id: id, userId } as FilterQuery<UserCard>, update, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Carte non trouvée');
    return updated;
  }

  async deleteCard(userIdStr: string, id: string) {
    const userId = new Types.ObjectId(userIdStr);
    const res = await this.userCardModel
      .deleteOne({ _id: id, userId } as FilterQuery<UserCard>)
      .exec();
    if (res.deletedCount === 0) throw new NotFoundException('Carte non trouvée');
  }

  async getStats(userIdStr: string) {
    const userId = new Types.ObjectId(userIdStr);

    const agg = await this.userCardModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalCards: { $sum: '$quantity' },
          distinctCards: { $sum: 1 },
          totalCost: {
            $sum: {
              $multiply: [{ $ifNull: ['$purchasePrice', 0] }, { $ifNull: ['$quantity', 1] }],
            },
          },
          totalCurrent: {
            $sum: {
              $multiply: [{ $ifNull: ['$currentValue', 0] }, { $ifNull: ['$quantity', 1] }],
            },
          },
          gradedCards: {
            $sum: {
              $cond: [{ $eq: ['$isGraded', true] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = (agg[0] ?? {
      totalCards: 0,
      distinctCards: 0,
      totalCost: 0,
      totalCurrent: 0,
      gradedCards: 0,
    }) as {
      totalCards: number;
      distinctCards: number;
      totalCost: number;
      totalCurrent: number;
      gradedCards: number;
    };

    const profit = (stats.totalCurrent ?? 0) - (stats.totalCost ?? 0);

    return {
      totalCards: stats.totalCards ?? 0,
      distinctCards: stats.distinctCards ?? 0,
      totalCost: stats.totalCost ?? 0,
      totalCurrent: stats.totalCurrent ?? 0,
      gradedCards: stats.gradedCards ?? 0,
      profit,
    };
  }
}
