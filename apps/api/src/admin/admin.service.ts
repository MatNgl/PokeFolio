import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDoc } from '../users/schemas/user.schema';
import {
  PortfolioItem,
  PortfolioItemDocument,
} from '../modules/portfolio/schemas/portfolio-item.schema';
import { CardsService } from '../cards/cards.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDoc>,
    @InjectModel(PortfolioItem.name)
    private readonly portfolioItemModel: Model<PortfolioItemDocument>,
    private readonly cardsService: CardsService
  ) {}

  /**
   * Statistiques globales
   */
  async getGlobalStats() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, newUsersThisWeek, totalCardsResult, newCardsThisWeek] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ createdAt: { $gte: oneWeekAgo } }).exec(),
      // Sum all quantities from portfolio items
      this.portfolioItemModel
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: '$quantity' },
            },
          },
        ])
        .exec(),
      this.portfolioItemModel.countDocuments({ createdAt: { $gte: oneWeekAgo } }).exec(),
    ]);

    // Calculate total value taking variants into account (same logic as portfolio.service.ts)
    const items = await this.portfolioItemModel.find().lean();
    let totalValue = 0;

    for (const item of items) {
      if (Array.isArray(item.variants) && item.variants.length > 0) {
        // Somme des prix d'achat par variante
        totalValue += item.variants.reduce((acc, v) => acc + (v.purchasePrice || 0), 0);
      } else {
        const unit = item.purchasePrice || 0;
        totalValue += unit * (item.quantity ?? 0);
      }
    }

    return {
      totalUsers,
      newUsersThisWeek,
      totalCards: totalCardsResult[0]?.total || 0,
      newCardsThisWeek,
      totalValue,
    };
  }

  /**
   * Top 10 cartes les plus possédées
   */
  async getTopCards(limit = 10) {
    const topCards = await this.portfolioItemModel
      .aggregate([
        {
          $group: {
            _id: '$cardId',
            totalQuantity: { $sum: '$quantity' },
            owners: { $sum: 1 },
            // Extract metadata from cardSnapshot
            cardSnapshot: { $first: '$cardSnapshot' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit },
      ])
      .exec();

    this.logger.log(`🔝 Top ${limit} cartes:`);
    topCards.forEach((card, idx) => {
      const snapshot = card.cardSnapshot as Record<string, unknown>;
      const cardName = (snapshot?.name as string) || (snapshot?.localId as string) || 'Unknown';
      const imageUrl = (snapshot?.imageUrl as string) || (snapshot?.imageUrlHiRes as string);
      this.logger.log(
        `  ${idx + 1}. ${cardName} (${card._id}): ${card.totalQuantity} exemplaires, ${card.owners} possesseurs, image: ${imageUrl ? '✓' : '✗'}`
      );
    });

    return topCards.map((card) => {
      const snapshot = card.cardSnapshot as Record<string, unknown>;
      const cardName = (snapshot?.name as string) || (snapshot?.localId as string) || 'Unknown';
      const set = snapshot?.set as Record<string, unknown> | undefined;
      const setName = (set?.name as string) || 'Unknown';
      const imageUrl = (snapshot?.imageUrl as string) || (snapshot?.imageUrlHiRes as string);

      return {
        cardId: card._id,
        name: cardName,
        setName: setName,
        imageUrl: imageUrl,
        totalQuantity: card.totalQuantity,
        ownersCount: card.owners,
      };
    });
  }

  /**
   * Top 10 users avec les collections les plus chères
   */
  async getTopUsers(limit = 10) {
    // Get all portfolio items and calculate value per user (taking variants into account)
    const items = await this.portfolioItemModel.find().lean();

    const userStats = new Map<string, { totalValue: number; cardsCount: number }>();

    for (const item of items) {
      const ownerId = item.ownerId;
      const existing = userStats.get(ownerId) || { totalValue: 0, cardsCount: 0 };

      let itemValue = 0;
      if (Array.isArray(item.variants) && item.variants.length > 0) {
        // Somme des prix d'achat par variante
        itemValue = item.variants.reduce((acc, v) => acc + (v.purchasePrice || 0), 0);
      } else {
        const unit = item.purchasePrice || 0;
        itemValue = unit * (item.quantity ?? 0);
      }

      userStats.set(ownerId, {
        totalValue: existing.totalValue + itemValue,
        cardsCount: existing.cardsCount + (item.quantity ?? 0),
      });
    }

    // Sort by totalValue and take top N
    const topUsers = Array.from(userStats.entries())
      .map(([ownerId, stats]) => ({ ownerId, ...stats }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    // Récupérer les infos des users (ownerId est un string, pas un ObjectId)
    const userIds = topUsers.map((u) => new Types.ObjectId(u.ownerId));
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .lean()
      .exec();

    const usersMap = new Map(users.map((u) => [u._id.toString(), u]));

    return topUsers.map((item) => {
      const user = usersMap.get(item.ownerId);
      return {
        userId: item.ownerId,
        email: user?.email || 'Unknown',
        pseudo: user?.pseudo || 'Unknown',
        totalValue: item.totalValue,
        cardsCount: item.cardsCount,
      };
    });
  }

  /**
   * Données pour graphiques d'évolution
   */
  async getChartsData(days = 30) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [newUsersByDay, newCardsByDay] = await Promise.all([
      this.userModel
        .aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
      this.portfolioItemModel
        .aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
    ]);

    return {
      newUsersByDay: newUsersByDay.map((d) => ({ date: d._id, count: d.count })),
      newCardsByDay: newCardsByDay.map((d) => ({ date: d._id, count: d.count })),
    };
  }

  /**
   * Répartition par sets
   */
  async getSetDistribution(limit = 20) {
    const distribution = await this.portfolioItemModel
      .aggregate([
        { $match: { 'cardSnapshot.set.name': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$cardSnapshot.set.name',
            cardsCount: { $sum: '$quantity' },
            uniqueCards: { $sum: 1 },
          },
        },
        { $sort: { cardsCount: -1 } },
        { $limit: limit },
      ])
      .exec();

    return distribution.map((set) => ({
      setName: set._id,
      cardsCount: set.cardsCount,
      uniqueCards: set.uniqueCards,
    }));
  }

  /**
   * Liste des users avec stats
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAllUsers(): Promise<any[]> {
    const users = await this.userModel.find().select('-passwordHash -refreshToken').lean().exec();

    const userIds = users.map((u) => u._id.toString());

    this.logger.log(`👥 Found ${users.length} users with IDs:`, userIds);

    // Get all portfolio items and calculate stats per user (taking variants into account)
    const items = await this.portfolioItemModel.find({ ownerId: { $in: userIds } }).lean();

    const userStatsMap = new Map<string, { cardsCount: number; totalValue: number }>();

    for (const item of items) {
      const ownerId = item.ownerId;
      const existing = userStatsMap.get(ownerId) || { cardsCount: 0, totalValue: 0 };

      let itemValue = 0;
      if (Array.isArray(item.variants) && item.variants.length > 0) {
        // Somme des prix d'achat par variante
        itemValue = item.variants.reduce((acc, v) => acc + (v.purchasePrice || 0), 0);
      } else {
        const unit = item.purchasePrice || 0;
        itemValue = unit * (item.quantity ?? 0);
      }

      userStatsMap.set(ownerId, {
        cardsCount: existing.cardsCount + (item.quantity ?? 0),
        totalValue: existing.totalValue + itemValue,
      });
    }

    this.logger.log(`📊 Stats found for ${userStatsMap.size} users`);
    userStatsMap.forEach((stats, ownerId) => {
      this.logger.log(`  User ${ownerId}: ${stats.cardsCount} cartes, ${stats.totalValue}€`);
    });

    return users.map((user) => {
      const userStats = userStatsMap.get(user._id.toString());
      return {
        ...user,
        cardsCount: userStats?.cardsCount || 0,
        totalValue: userStats?.totalValue || 0,
      };
    });
  }

  /**
   * Détail d'un user avec son portfolio
   */
  async getUserDetails(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash -refreshToken')
      .lean()
      .exec();

    if (!user) {
      return null;
    }

    const portfolioItems = await this.portfolioItemModel.find({ ownerId: userId }).lean().exec();

    // Calculate total value taking variants into account
    let totalValue = 0;
    for (const item of portfolioItems) {
      if (Array.isArray(item.variants) && item.variants.length > 0) {
        totalValue += item.variants.reduce((acc, v) => acc + (v.purchasePrice || 0), 0);
      } else {
        const unit = item.purchasePrice || 0;
        totalValue += unit * (item.quantity ?? 0);
      }
    }

    const cardsCount = portfolioItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Transform portfolio items to include card metadata
    const cards = portfolioItems.map((item) => {
      const snapshot = item.cardSnapshot as Record<string, unknown>;
      const set = snapshot?.set as Record<string, unknown> | undefined;
      return {
        _id: item._id,
        cardId: item.cardId,
        name: (snapshot?.name as string) || (snapshot?.localId as string) || 'Unknown',
        setName: (set?.name as string) || 'Unknown',
        imageUrl: (snapshot?.imageUrl as string) || (snapshot?.imageUrlHiRes as string),
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        purchaseDate: item.purchaseDate,
        graded: item.graded,
        grading: item.grading,
        notes: item.notes,
        language: item.language,
      };
    });

    return {
      user,
      cards,
      stats: {
        cardsCount,
        totalValue,
      },
    };
  }

  /**
   * Supprimer un user et son portfolio
   */
  async deleteUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // Supprimer les portfolio items du user
    await this.portfolioItemModel.deleteMany({ ownerId: userId }).exec();

    // Supprimer le user
    const result = await this.userModel.findByIdAndDelete(userObjectId).exec();

    return result;
  }

  /**
   * Supprimer une carte du portfolio d'un user
   */
  async deleteUserCard(userId: string, cardId: string) {
    const result = await this.portfolioItemModel
      .findOneAndDelete({
        _id: new Types.ObjectId(cardId),
        ownerId: userId,
      })
      .exec();

    return result;
  }
}
