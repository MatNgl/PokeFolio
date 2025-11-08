import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDoc } from '../users/schemas/user.schema';
import { UserCard, UserCardDocument } from '../cards/schemas/user-card.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDoc>,
    @InjectModel(UserCard.name) private readonly userCardModel: Model<UserCardDocument>
  ) {}

  /**
   * Statistiques globales
   */
  async getGlobalStats() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Debug: Liste des collections
    try {
      const collections = await this.userCardModel.db?.db?.listCollections().toArray();
      console.log('🔍 Collections dans la base:', collections?.map((c) => c.name) || 'N/A');
    } catch (e) {
      console.log('⚠️ Impossible de lister les collections');
    }

    const [totalUsers, newUsersThisWeek, totalCards, newCardsThisWeek, totalValue] =
      await Promise.all([
        this.userModel.countDocuments().exec(),
        this.userModel.countDocuments({ createdAt: { $gte: oneWeekAgo } }).exec(),
        this.userCardModel.countDocuments().exec(),
        this.userCardModel.countDocuments({ createdAt: { $gte: oneWeekAgo } }).exec(),
        this.userCardModel
          .aggregate([
            {
              $group: {
                _id: null,
                total: { $sum: { $multiply: ['$quantity', '$currentValue'] } },
              },
            },
          ])
          .exec()
          .then((res) => res[0]?.total || 0),
      ]);

    console.log('📊 Stats calculées:', {
      totalUsers,
      newUsersThisWeek,
      totalCards,
      newCardsThisWeek,
      totalValue,
    });

    return {
      totalUsers,
      newUsersThisWeek,
      totalCards,
      newCardsThisWeek,
      totalValue,
    };
  }

  /**
   * Top 10 cartes les plus possédées
   */
  async getTopCards(limit = 10) {
    const topCards = await this.userCardModel
      .aggregate([
        {
          $group: {
            _id: '$cardId',
            totalQuantity: { $sum: '$quantity' },
            owners: { $sum: 1 },
            cardName: { $first: '$name' },
            setName: { $first: '$setName' },
            imageUrl: { $first: '$imageUrl' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit },
      ])
      .exec();

    return topCards.map((card) => ({
      cardId: card._id,
      name: card.cardName,
      setName: card.setName,
      imageUrl: card.imageUrl,
      totalQuantity: card.totalQuantity,
      ownersCount: card.owners,
    }));
  }

  /**
   * Top 10 users avec les collections les plus chères
   */
  async getTopUsers(limit = 10) {
    const topUsers = await this.userCardModel
      .aggregate([
        {
          $group: {
            _id: '$userId',
            totalValue: { $sum: { $multiply: ['$quantity', '$currentValue'] } },
            cardsCount: { $sum: '$quantity' },
          },
        },
        { $sort: { totalValue: -1 } },
        { $limit: limit },
      ])
      .exec();

    // Récupérer les infos des users
    const userIds = topUsers.map((u) => u._id);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .lean()
      .exec();

    const usersMap = new Map(users.map((u) => [u._id.toString(), u]));

    return topUsers.map((item) => {
      const user = usersMap.get(item._id.toString());
      return {
        userId: item._id,
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
      this.userCardModel
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
    const distribution = await this.userCardModel
      .aggregate([
        { $match: { setName: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$setName',
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

    const userIds = users.map((u) => u._id);
    console.log("👥 Nombre d'utilisateurs trouvés:", users.length);

    // Récupérer les stats de chaque user
    const stats = await this.userCardModel
      .aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $group: {
            _id: '$userId',
            cardsCount: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$currentValue'] } },
          },
        },
      ])
      .exec();

    console.log('📈 Stats agrégées pour', stats.length, 'utilisateurs');
    console.log('📈 Exemple de stats:', stats[0]);

    const statsMap = new Map(stats.map((s) => [s._id.toString(), s]));

    return users.map((user) => {
      const userStats = statsMap.get(user._id.toString());
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

    const cards = await this.userCardModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    const totalValue = cards.reduce(
      (sum, card) => sum + (card.quantity || 0) * (card.currentValue || 0),
      0
    );
    const cardsCount = cards.reduce((sum, card) => sum + (card.quantity || 0), 0);

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

    // Supprimer les cartes du user
    await this.userCardModel.deleteMany({ userId: userObjectId }).exec();

    // Supprimer le user
    const result = await this.userModel.findByIdAndDelete(userObjectId).exec();

    return result;
  }

  /**
   * Supprimer une carte du portfolio d'un user
   */
  async deleteUserCard(userId: string, cardId: string) {
    const result = await this.userCardModel
      .findOneAndDelete({
        _id: new Types.ObjectId(cardId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return result;
  }
}
