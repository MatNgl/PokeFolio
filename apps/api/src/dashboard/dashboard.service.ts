import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PortfolioItem,
  PortfolioItemDocument,
} from '../modules/portfolio/schemas/portfolio-item.schema';
import { DashboardSummaryDto, MetricChange } from './dto/summary.dto';
import {
  TimeSeriesMetric,
  TimeSeriesPeriod,
  TimeSeriesBucket,
  TimeSeriesDataPoint,
  TimeSeriesResponseDto,
} from './dto/timeseries.dto';
import { GradeDistributionDto, GradeCompanyDistribution } from './dto/distribution.dto';
import { TopSetsDto, TopSetItem } from './dto/top-sets.dto';
import { RecentActivityDto, RecentActivityItem, ActivityType } from './dto/activity.dto';
import { ExpensiveCardsDto, ExpensiveCardItem } from './dto/expensive-cards.dto';

interface CardSnapshot {
  name?: string;
  image?: string | { small?: string; large?: string };
  set?: { id?: string; name?: string };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(PortfolioItem.name)
    private portfolioModel: Model<PortfolioItemDocument>
  ) {}

  /**
   * Calcule le résumé des KPIs avec variations période précédente
   */
  async getSummary(userId: string): Promise<DashboardSummaryDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Période actuelle (30 derniers jours)
    const currentPeriod = await this.portfolioModel.aggregate<{
      totalCards: number;
      totalSets: number;
      totalValue: number;
      gradedCount: number;
    }>([
      {
        $match: {
          ownerId: userId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $addFields: {
          // Extraction du setId depuis cardSnapshot
          setId: {
            $cond: {
              if: { $ifNull: ['$cardSnapshot.set.id', false] },
              then: '$cardSnapshot.set.id',
              else: null,
            },
          },
          // Calcul si la carte est gradée (mode A ou variants mode B)
          effectiveGraded: {
            $cond: {
              if: { $eq: ['$graded', true] },
              then: true,
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $anyElementTrue: {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: { $eq: ['$$v.graded', true] },
                      },
                    },
                  },
                  else: false,
                },
              },
            },
          },
          // Extraction du prix (mode A ou somme variants)
          effectivePrice: {
            $cond: {
              if: { $ifNull: ['$purchasePrice', false] },
              then: '$purchasePrice',
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $sum: {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: { $ifNull: ['$$v.purchasePrice', 0] },
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCards: { $sum: '$quantity' },
          totalSets: { $addToSet: '$setId' },
          totalValue: { $sum: '$effectivePrice' },
          gradedCount: {
            $sum: {
              $cond: [
                '$effectiveGraded',
                { $cond: [{ $isArray: '$variants' }, { $size: '$variants' }, 1] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCards: 1,
          totalSets: { $size: '$totalSets' },
          totalValue: 1,
          gradedCount: 1,
        },
      },
    ]);

    // Période précédente (30 jours avant)
    const previousPeriod = await this.portfolioModel.aggregate<{
      totalCards: number;
      totalSets: number;
      totalValue: number;
      gradedCount: number;
    }>([
      {
        $match: {
          ownerId: userId,
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        },
      },
      {
        $addFields: {
          setId: {
            $cond: {
              if: { $ifNull: ['$cardSnapshot.set.id', false] },
              then: '$cardSnapshot.set.id',
              else: null,
            },
          },
          effectiveGraded: {
            $cond: {
              if: { $eq: ['$graded', true] },
              then: true,
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $anyElementTrue: {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: { $eq: ['$$v.graded', true] },
                      },
                    },
                  },
                  else: false,
                },
              },
            },
          },
          effectivePrice: {
            $cond: {
              if: { $ifNull: ['$purchasePrice', false] },
              then: '$purchasePrice',
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $sum: {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: { $ifNull: ['$$v.purchasePrice', 0] },
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCards: { $sum: '$quantity' },
          totalSets: { $addToSet: '$setId' },
          totalValue: { $sum: '$effectivePrice' },
          gradedCount: {
            $sum: {
              $cond: [
                '$effectiveGraded',
                { $cond: [{ $isArray: '$variants' }, { $size: '$variants' }, 1] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCards: 1,
          totalSets: { $size: '$totalSets' },
          totalValue: 1,
          gradedCount: 1,
        },
      },
    ]);

    const current = currentPeriod[0] || {
      totalCards: 0,
      totalSets: 0,
      totalValue: 0,
      gradedCount: 0,
    };
    const previous = previousPeriod[0] || {
      totalCards: 0,
      totalSets: 0,
      totalValue: 0,
      gradedCount: 0,
    };

    return {
      totalCards: this.calculateChange(current.totalCards, previous.totalCards),
      totalSets: this.calculateChange(current.totalSets, previous.totalSets),
      totalValue: this.calculateChange(current.totalValue, previous.totalValue),
      gradedCount: this.calculateChange(current.gradedCount, previous.gradedCount),
      calculatedAt: now,
    };
  }

  /**
   * Récupère les séries temporelles
   */
  async getTimeSeries(
    userId: string,
    metric: TimeSeriesMetric,
    period: TimeSeriesPeriod,
    bucket: TimeSeriesBucket
  ): Promise<TimeSeriesResponseDto> {
    const { startDate, bucketFormat } = this.getPeriodConfig(period, bucket);

    const matchStage = {
      $match: {
        ownerId: userId,
        createdAt: { $gte: startDate },
      },
    };

    const addFieldsStage = {
      $addFields: {
        effectivePrice: {
          $cond: {
            if: { $ifNull: ['$purchasePrice', false] },
            then: '$purchasePrice',
            else: {
              $cond: {
                if: { $isArray: '$variants' },
                then: {
                  $sum: {
                    $map: {
                      input: '$variants',
                      as: 'v',
                      in: { $ifNull: ['$$v.purchasePrice', 0] },
                    },
                  },
                },
                else: 0,
              },
            },
          },
        },
        bucketDate: this.getBucketDateExpression(bucketFormat),
      },
    };

    const groupStage =
      metric === TimeSeriesMetric.COUNT
        ? {
            $group: {
              _id: '$bucketDate',
              value: { $sum: '$quantity' },
            },
          }
        : {
            $group: {
              _id: '$bucketDate',
              value: { $sum: '$effectivePrice' },
            },
          };

    const sortStage = { $sort: { _id: 1 as const } };

    const data = await this.portfolioModel.aggregate<{
      _id: string;
      value: number;
    }>([matchStage, addFieldsStage, groupStage, sortStage]);

    const dataPoints: TimeSeriesDataPoint[] = data.map((item) => ({
      date: item._id, // MongoDB $dateToString retourne déjà une string formatée
      value: Math.round(item.value * 100) / 100,
    }));

    return {
      metric,
      period,
      bucket,
      data: dataPoints,
    };
  }

  /**
   * Récupère la distribution gradé vs non gradé
   */
  async getGradeDistribution(userId: string): Promise<GradeDistributionDto> {
    const results = await this.portfolioModel.aggregate<{
      graded: number;
      normal: number;
      byCompany: Array<{ company: string; count: number }>;
    }>([
      { $match: { ownerId: userId } },
      {
        $addFields: {
          effectiveGraded: {
            $cond: {
              if: { $eq: ['$graded', true] },
              then: true,
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $anyElementTrue: {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: { $eq: ['$$v.graded', true] },
                      },
                    },
                  },
                  else: false,
                },
              },
            },
          },
          gradeCompany: {
            $cond: {
              if: { $ifNull: ['$grading.company', false] },
              then: '$grading.company',
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$variants',
                              as: 'v',
                              cond: { $eq: ['$$v.graded', true] },
                            },
                          },
                          as: 'v',
                          in: '$$v.grading.company',
                        },
                      },
                      0,
                    ],
                  },
                  else: null,
                },
              },
            },
          },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                graded: {
                  $sum: {
                    $cond: ['$effectiveGraded', '$quantity', 0],
                  },
                },
                normal: {
                  $sum: {
                    $cond: ['$effectiveGraded', 0, '$quantity'],
                  },
                },
              },
            },
          ],
          companies: [
            { $match: { effectiveGraded: true } },
            { $unwind: { path: '$gradeCompany', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: '$gradeCompany',
                count: { $sum: '$quantity' },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
          ],
        },
      },
      {
        $project: {
          graded: { $arrayElemAt: ['$totals.graded', 0] },
          normal: { $arrayElemAt: ['$totals.normal', 0] },
          byCompany: {
            $map: {
              input: '$companies',
              as: 'c',
              in: { company: '$$c._id', count: '$$c.count' },
            },
          },
        },
      },
    ]);

    const result = results[0] || { graded: 0, normal: 0, byCompany: [] };
    const total = result.graded + result.normal;
    const gradedPercentage = total > 0 ? Math.round((result.graded / total) * 100) : 0;

    const byCompany: GradeCompanyDistribution[] = result.byCompany.map((item) => ({
      company: item.company,
      count: item.count,
      percentage: result.graded > 0 ? Math.round((item.count / result.graded) * 10000) / 100 : 0,
    }));

    return {
      graded: result.graded,
      normal: result.normal,
      total,
      gradedPercentage,
      byCompany,
    };
  }

  /**
   * Récupère le top des sets
   */
  async getTopSets(userId: string, limit: number): Promise<TopSetsDto> {
    const topSets = await this.portfolioModel.aggregate<TopSetItem>([
      { $match: { ownerId: userId } },
      {
        $addFields: {
          setId: {
            $cond: {
              if: { $ifNull: ['$cardSnapshot.set.id', false] },
              then: '$cardSnapshot.set.id',
              else: 'unknown',
            },
          },
          setName: {
            $cond: {
              if: { $ifNull: ['$cardSnapshot.set.name', false] },
              then: '$cardSnapshot.set.name',
              else: 'Unknown Set',
            },
          },
          effectivePrice: {
            $cond: {
              if: { $ifNull: ['$purchasePrice', false] },
              then: '$purchasePrice',
              else: {
                $cond: {
                  if: { $isArray: '$variants' },
                  then: {
                    $sum: {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: { $ifNull: ['$$v.purchasePrice', 0] },
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$setId',
          setName: { $first: '$setName' },
          cardCount: { $sum: '$quantity' },
          totalValue: { $sum: '$effectivePrice' },
        },
      },
      { $sort: { cardCount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          setId: '$_id',
          setName: 1,
          cardCount: 1,
          totalValue: { $round: ['$totalValue', 2] },
        },
      },
    ]);

    const totalSetsResult = await this.portfolioModel.aggregate<{ count: number }>([
      { $match: { ownerId: userId } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $ifNull: ['$cardSnapshot.set.id', false] },
              then: '$cardSnapshot.set.id',
              else: 'unknown',
            },
          },
        },
      },
      { $count: 'count' },
    ]);

    const totalSets = totalSetsResult[0]?.count || 0;

    return {
      sets: topSets,
      totalSets,
    };
  }

  /**
   * Récupère les activités récentes
   */
  async getRecentActivity(userId: string, limit: number): Promise<RecentActivityDto> {
    const activities = await this.portfolioModel
      .find({ ownerId: userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean<PortfolioItemDocument[]>()
      .exec();

    const items: RecentActivityItem[] = activities.map((item) => {
      const snapshot = item.cardSnapshot as CardSnapshot | undefined;
      let imageUrl: string | undefined;

      if (snapshot?.image) {
        if (typeof snapshot.image === 'string') {
          imageUrl = snapshot.image;
        } else if (snapshot.image.large) {
          imageUrl = snapshot.image.large;
        } else if (snapshot.image.small) {
          imageUrl = snapshot.image.small;
        }
      }

      const isGraded =
        item.graded === true ||
        (Array.isArray(item.variants) && item.variants.some((v) => v.graded === true));

      // Déterminer le type d'activité
      const createdTime = new Date(item.createdAt).getTime();
      const updatedTime = new Date(item.updatedAt).getTime();
      const type = updatedTime - createdTime > 1000 ? ActivityType.UPDATED : ActivityType.ADDED;

      return {
        itemId: String(item._id),
        cardId: item.cardId,
        cardName: snapshot?.name,
        imageUrl,
        type,
        date: item.updatedAt,
        quantity: item.quantity,
        isGraded,
      };
    });

    return { activities: items };
  }

  /**
   * Récupère les cartes les plus chères
   */
  async getExpensiveCards(userId: string, limit: number): Promise<ExpensiveCardsDto> {
    const cards = await this.portfolioModel
      .find({ ownerId: userId })
      .lean<PortfolioItemDocument[]>()
      .exec();

    // Calculer le prix effectif pour chaque carte (Mode A ou somme variants Mode B)
    const cardsWithPrice = cards
      .map((item) => {
        const snapshot = item.cardSnapshot as CardSnapshot | undefined;
        let imageUrl: string | undefined;

        if (snapshot?.image) {
          if (typeof snapshot.image === 'string') {
            imageUrl = snapshot.image;
          } else if (snapshot.image.large) {
            imageUrl = snapshot.image.large;
          } else if (snapshot.image.small) {
            imageUrl = snapshot.image.small;
          }
        }

        // Mode A : prix direct
        if (item.purchasePrice !== undefined && item.purchasePrice > 0) {
          return {
            itemId: String(item._id),
            cardId: item.cardId,
            cardName: snapshot?.name,
            imageUrl,
            price: item.purchasePrice,
            isGraded: item.graded === true,
            gradeCompany: item.grading?.company,
            gradeScore: item.grading?.grade,
            setName: snapshot?.set?.name,
          };
        }

        // Mode B : chercher le variant le plus cher
        if (Array.isArray(item.variants) && item.variants.length > 0) {
          const maxVariant = item.variants.reduce((max, v) => {
            const vPrice = v.purchasePrice ?? 0;
            const maxPrice = max.purchasePrice ?? 0;
            return vPrice > maxPrice ? v : max;
          }, item.variants[0]);

          if (maxVariant && maxVariant.purchasePrice && maxVariant.purchasePrice > 0) {
            return {
              itemId: String(item._id),
              cardId: item.cardId,
              cardName: snapshot?.name,
              imageUrl,
              price: maxVariant.purchasePrice,
              isGraded: maxVariant.graded === true,
              gradeCompany: maxVariant.grading?.company,
              gradeScore: maxVariant.grading?.grade,
              setName: snapshot?.set?.name,
            };
          }
        }

        return null;
      })
      .filter((card): card is ExpensiveCardItem => card !== null && card.price > 0);

    // Trier par prix décroissant et prendre les N premiers
    const topCards = cardsWithPrice.sort((a, b) => b.price - a.price).slice(0, limit);

    return { cards: topCards };
  }

  // ────────────────────────────────────────────────────────────
  // Méthodes utilitaires
  // ────────────────────────────────────────────────────────────

  private calculateChange(current: number, previous: number): MetricChange {
    const percentChange =
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      value: current,
      percentChange: Math.round(percentChange * 100) / 100,
      previousValue: previous,
    };
  }

  private getPeriodConfig(
    period: TimeSeriesPeriod,
    bucket: TimeSeriesBucket
  ): { startDate: Date; bucketFormat: string } {
    const now = new Date();
    let startDate: Date;
    let bucketFormat: string;

    switch (period) {
      case TimeSeriesPeriod.SEVEN_DAYS:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        bucketFormat = bucket === TimeSeriesBucket.DAILY ? '%Y-%m-%d' : '%Y-%U';
        break;
      case TimeSeriesPeriod.THIRTY_DAYS:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        bucketFormat = bucket === TimeSeriesBucket.DAILY ? '%Y-%m-%d' : '%Y-%U';
        break;
      case TimeSeriesPeriod.SIX_MONTHS:
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        bucketFormat = bucket === TimeSeriesBucket.MONTHLY ? '%Y-%m' : '%Y-%U';
        break;
      case TimeSeriesPeriod.ONE_YEAR:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        bucketFormat = '%Y-%m';
        break;
      case TimeSeriesPeriod.ALL:
        startDate = new Date(0); // Epoch
        bucketFormat = '%Y-%m';
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        bucketFormat = '%Y-%m-%d';
    }

    return { startDate, bucketFormat };
  }

  private getBucketDateExpression(format: string): Record<string, unknown> {
    return {
      $dateToString: {
        format,
        date: {
          $ifNull: [
            '$purchaseDate',
            {
              $cond: {
                if: { $isArray: '$variants' },
                then: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: '$variants',
                        as: 'v',
                        in: '$$v.purchaseDate',
                      },
                    },
                    0,
                  ],
                },
                else: '$createdAt',
              },
            },
          ],
        },
      },
    };
  }

  private formatDate(date: Date, bucket: TimeSeriesBucket): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (bucket) {
      case TimeSeriesBucket.DAILY:
        return `${year}-${month}-${day}`;
      case TimeSeriesBucket.WEEKLY:
        return `${year}-W${this.getWeekNumber(date)}`;
      case TimeSeriesBucket.MONTHLY:
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return String(weekNo).padStart(2, '0');
  }
}
