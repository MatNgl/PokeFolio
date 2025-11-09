import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDoc } from '../users/schemas/user.schema';
import { UserCard, UserCardDocument } from '../cards/schemas/user-card.schema';
import { CardsService } from '../cards/cards.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDoc>,
    @InjectModel(UserCard.name) private readonly userCardModel: Model<UserCardDocument>,
    private readonly cardsService: CardsService
  ) {}

  /**
   * Statistiques globales
   */
  async getGlobalStats() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
                total: {
                  $sum: {
                    $multiply: [
                      '$quantity',
                      { $ifNull: ['$currentValue', 0] }, // Gérer les valeurs null
                    ],
                  },
                },
              },
            },
          ])
          .exec()
          .then((res) => res[0]?.total || 0),
      ]);

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

    this.logger.log(`🔝 Top ${limit} cartes:`);
    topCards.forEach((card, idx) => {
      this.logger.log(
        `  ${idx + 1}. ${card.cardName} (${card._id}): ${card.totalQuantity} exemplaires, ${card.owners} possesseurs, image: ${card.imageUrl ? '✓' : '✗'}`
      );
    });

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

    this.logger.log(
      `👥 Found ${users.length} users with IDs:`,
      userIds.map((id) => id.toString())
    );

    // Récupérer les stats de chaque user
    const stats = await this.userCardModel
      .aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $group: {
            _id: '$userId',
            cardsCount: { $sum: '$quantity' },
            totalValue: {
              $sum: {
                $multiply: ['$quantity', { $ifNull: ['$currentValue', 0] }],
              },
            },
          },
        },
      ])
      .exec();

    this.logger.log(`📊 Stats found for ${stats.length} users`);
    stats.forEach((s) => {
      this.logger.log(`  User ${s._id}: ${s.cardsCount} cartes, ${s.totalValue}€`);
    });

    // Debug: Vérifier les cartes sans match
    const allCards = await this.userCardModel.find().select('userId').lean().exec();
    const cardUserIds = new Set(allCards.map((c) => c.userId.toString()));
    const userIdsSet = new Set(userIds.map((id) => id.toString()));

    const orphanedUserIds = [...cardUserIds].filter((id) => !userIdsSet.has(id));
    if (orphanedUserIds.length > 0) {
      this.logger.warn(
        `⚠️ Found ${orphanedUserIds.length} cards with userId that don't match any user:`
      );
      orphanedUserIds.forEach((id) => this.logger.warn(`  - ${id}`));
    }

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

  /**
   * Debug endpoint to check data consistency
   */
  async debugDataConsistency() {
    // 1. Compter les utilisateurs
    const usersCount = await this.userModel.countDocuments().exec();
    const users = await this.userModel.find().select('_id email pseudo').lean().exec();

    // 2. Compter les cartes totales
    const totalCardsCount = await this.userCardModel.countDocuments().exec();

    // 3. Pour chaque user, compter ses cartes directement
    const userCardDetails = await Promise.all(
      users.map(async (user) => {
        const userCards = await this.userCardModel
          .find({ userId: user._id })
          .select('_id name quantity')
          .limit(3)
          .lean()
          .exec();

        const totalQuantity = await this.userCardModel
          .aggregate([
            { $match: { userId: user._id } },
            { $group: { _id: null, total: { $sum: '$quantity' } } },
          ])
          .exec();

        return {
          userId: user._id.toString(),
          email: user.email,
          pseudo: user.pseudo,
          totalQuantity: totalQuantity[0]?.total || 0,
          sampleCards: userCards.map((c) => ({
            name: c.name,
            quantity: c.quantity,
          })),
        };
      })
    );

    // 4. Regarder quelques exemples de cartes et leurs userId
    const allCardsWithUserId = await this.userCardModel
      .find()
      .select('userId name quantity')
      .limit(20)
      .lean()
      .exec();

    // 5. Vérifier les aggregations (comme dans getAllUsers)
    const userIds = users.map((u) => u._id);
    const aggregatedStats = await this.userCardModel
      .aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $group: {
            _id: '$userId',
            cardsCount: { $sum: '$quantity' },
          },
        },
      ])
      .exec();

    return {
      summary: {
        totalUsers: usersCount,
        totalCardDocuments: totalCardsCount,
      },
      allUsers: userCardDetails,
      aggregationResults: aggregatedStats.map((s) => ({
        userId: s._id.toString(),
        cardsCount: s.cardsCount,
      })),
      sampleCardsWithUserIds: allCardsWithUserId.map((c) => ({
        userId: c.userId.toString(),
        name: c.name,
        quantity: c.quantity,
      })),
    };
  }

  /**
   * Check current user's cards and verify userId consistency
   */
  async debugCurrentUserCards(currentUserId: string) {
    // 1. Récupérer l'utilisateur actuel
    const currentUser = await this.userModel.findById(currentUserId).lean().exec();

    if (!currentUser) {
      return { error: 'User not found' };
    }

    // 2. Chercher les cartes avec ce userId
    const cardsWithCurrentId = await this.userCardModel
      .find({ userId: new Types.ObjectId(currentUserId) })
      .select('name quantity')
      .lean()
      .exec();

    const totalWithCurrentId = cardsWithCurrentId.reduce((sum, c) => sum + (c.quantity || 0), 0);

    // 3. Chercher toutes les cartes orphelines (userId qui ne correspond à aucun user)
    const allUsers = await this.userModel.find().select('_id').lean().exec();
    const allUserIds = new Set(allUsers.map((u) => u._id.toString()));

    const allCards = await this.userCardModel.find().select('userId name quantity').lean().exec();
    const orphanedCards = allCards.filter((c) => !allUserIds.has(c.userId.toString()));

    // 4. Grouper les cartes orphelines par userId
    const orphanedByUserId = new Map<
      string,
      Array<{ userId: Types.ObjectId; name: string; quantity: number }>
    >();
    orphanedCards.forEach((card) => {
      const uid = card.userId.toString();
      if (!orphanedByUserId.has(uid)) {
        orphanedByUserId.set(uid, []);
      }
      orphanedByUserId.get(uid)!.push(card);
    });

    const orphanedSummary = Array.from(orphanedByUserId.entries()).map(([userId, cards]) => ({
      orphanedUserId: userId,
      cardsCount: cards.reduce((sum, c) => sum + (c.quantity || 0), 0),
      sampleCards: cards.slice(0, 5).map((c) => ({ name: c.name, quantity: c.quantity })),
    }));

    return {
      currentUser: {
        _id: currentUser._id.toString(),
        email: currentUser.email,
        pseudo: currentUser.pseudo,
      },
      cardsWithCurrentUserId: {
        count: totalWithCurrentId,
        samples: cardsWithCurrentId
          .slice(0, 5)
          .map((c) => ({ name: c.name, quantity: c.quantity })),
      },
      orphanedCards: {
        totalOrphanedUserIds: orphanedByUserId.size,
        orphanedGroups: orphanedSummary,
      },
    };
  }

  /**
   * Migrate orphaned cards to a target user
   */
  async migrateOrphanedCards(targetUserId: string, orphanedUserId: string) {
    this.logger.log(`🔄 Migrating cards from ${orphanedUserId} to ${targetUserId}`);

    // Vérifier que le target user existe
    const targetUser = await this.userModel.findById(targetUserId).lean().exec();
    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Compter les cartes à migrer
    const cardsToMigrate = await this.userCardModel
      .find({ userId: new Types.ObjectId(orphanedUserId) })
      .lean()
      .exec();

    this.logger.log(`📦 Found ${cardsToMigrate.length} cards to migrate`);

    // Mettre à jour toutes les cartes
    const result = await this.userCardModel
      .updateMany(
        { userId: new Types.ObjectId(orphanedUserId) },
        { $set: { userId: new Types.ObjectId(targetUserId) } }
      )
      .exec();

    this.logger.log(`✅ Migrated ${result.modifiedCount} cards`);

    return {
      success: true,
      migratedCount: result.modifiedCount,
      targetUser: {
        _id: targetUser._id.toString(),
        email: targetUser.email,
        pseudo: targetUser.pseudo,
      },
    };
  }

  /**
   * Auto-fix all users: find their JWT userId and migrate to current _id
   */
  async autoFixAllUsers() {
    this.logger.log('🔄 Starting auto-fix for all users...');

    // 1. Récupérer tous les utilisateurs
    const allUsers = await this.userModel.find().select('_id email').lean().exec();
    const allUserIds = new Set(allUsers.map((u) => u._id.toString()));

    // 2. Récupérer toutes les cartes
    const allCards = await this.userCardModel.find().select('userId').lean().exec();

    // 3. Trouver tous les userId uniques dans les cartes
    const cardUserIds = new Set(allCards.map((c) => c.userId.toString()));

    // 4. Trouver les userId orphelins
    const orphanedUserIds = [...cardUserIds].filter((id) => !allUserIds.has(id));

    this.logger.log(`📊 Found ${orphanedUserIds.length} orphaned userIds`);
    this.logger.log(`👥 Current users: ${allUsers.length}`);

    const migrations: Array<{ from: string; to: string; email: string; cardsCount: number }> = [];

    // 5. Pour chaque userId orphelin, compter les cartes
    for (const orphanedId of orphanedUserIds) {
      const cardsCount = await this.userCardModel
        .countDocuments({ userId: new Types.ObjectId(orphanedId) })
        .exec();

      this.logger.log(`📦 Orphaned userId ${orphanedId}: ${cardsCount} cards`);

      // Pour l'instant, on ne peut pas deviner quel user correspond
      // On va juste lister les cartes orphelines
      migrations.push({
        from: orphanedId,
        to: 'UNKNOWN',
        email: 'UNKNOWN',
        cardsCount,
      });
    }

    return {
      summary: {
        totalUsers: allUsers.length,
        totalOrphanedUserIds: orphanedUserIds.length,
        totalOrphanedCards: migrations.reduce((sum, m) => sum + m.cardsCount, 0),
      },
      migrations,
      message:
        'Cannot auto-migrate without knowing which user owns which orphaned cards. Use migrate-orphaned-cards endpoint manually.',
    };
  }

  /**
   * Backfill missing card metadata (imageUrl, imageUrlHiRes)
   */
  async backfillCardMetadata() {
    this.logger.log('🔄 Starting card metadata backfill...');

    // Find all cards with missing imageUrl
    const cardsWithoutImages = await this.userCardModel
      .find({
        $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }, { imageUrl: '' }],
      })
      .lean()
      .exec();

    this.logger.log(`📊 Found ${cardsWithoutImages.length} cards without images`);

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userCard of cardsWithoutImages) {
      try {
        // Fetch card details from TCGdex
        const cardDetails = await this.cardsService.getCardById(userCard.cardId, 'fr');

        if (cardDetails) {
          const imageUrl = cardDetails.image || cardDetails.images?.small;
          const imageUrlHiRes = cardDetails.images?.large;

          if (imageUrl) {
            await this.userCardModel
              .updateOne(
                { _id: userCard._id },
                {
                  $set: {
                    imageUrl,
                    imageUrlHiRes: imageUrlHiRes || imageUrl,
                  },
                }
              )
              .exec();

            updated++;
            this.logger.log(`✅ Updated ${userCard.name} (${userCard.cardId})`);
          } else {
            this.logger.warn(`⚠️ No image found for ${userCard.name} (${userCard.cardId})`);
            failed++;
          }
        } else {
          this.logger.warn(`⚠️ Card not found in TCGdex: ${userCard.cardId}`);
          failed++;
          errors.push(`${userCard.name} (${userCard.cardId})`);
        }
      } catch (error) {
        this.logger.error(`❌ Error processing ${userCard.name} (${userCard.cardId}):`, error);
        failed++;
        errors.push(`${userCard.name} (${userCard.cardId}): ${error}`);
      }
    }

    this.logger.log(`🎉 Backfill complete: ${updated} updated, ${failed} failed`);

    return {
      total: cardsWithoutImages.length,
      updated,
      failed,
      errors: errors.slice(0, 10), // Limit errors to first 10
    };
  }
}
