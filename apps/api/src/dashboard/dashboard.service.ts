import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PortfolioItem,
  PortfolioItemDocument,
} from '../modules/portfolio/schemas/portfolio-item.schema';
import { DashboardSummaryDto, SummaryQueryDto } from './dto/summary.dto';
import {
  TimeSeriesMetric,
  TimeSeriesQueryDto,
  TimeSeriesBucket,
  TimeSeriesDataPoint,
  TimeSeriesResponseDto,
  PeriodFilterDto,
  PeriodType,
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
   * Calcule le résumé des KPIs pour la période spécifiée
   */
  async getSummary(userId: string, filter: SummaryQueryDto): Promise<DashboardSummaryDto> {
    const { startDate, endDate } = this.getPeriodDates(filter);

    // Créer le match stage en fonction de la période
    const matchStage: {
      ownerId: string;
      createdAt?: { $gte: Date; $lte?: Date };
    } = {
      ownerId: userId,
    };

    // Si on a une période spécifique (pas "all"), filtrer par date
    if (startDate) {
      matchStage.createdAt = { $gte: startDate };
      if (endDate) {
        matchStage.createdAt.$lte = endDate;
      }
    }

    // Calcul des métriques pour la période
    const result = await this.portfolioModel.aggregate<{
      totalCards: number;
      distinctCards: number;
      totalSets: number;
      totalValue: number;
      gradedCount: number;
    }>([
      {
        $match: matchStage,
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
          distinctCards: { $addToSet: '$cardId' },
          totalSets: { $addToSet: '$setId' },
          totalValue: { $sum: '$effectivePrice' },
          gradedCount: {
            $sum: {
              $cond: ['$effectiveGraded', '$quantity', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCards: 1,
          distinctCards: { $size: '$distinctCards' },
          totalSets: { $size: '$totalSets' },
          totalValue: 1,
          gradedCount: 1,
        },
      },
    ]);

    const data = result[0] || {
      totalCards: 0,
      distinctCards: 0,
      totalSets: 0,
      totalValue: 0,
      gradedCount: 0,
    };

    return {
      totalCards: data.totalCards,
      distinctCards: data.distinctCards,
      totalSets: data.totalSets,
      totalValue: Math.round(data.totalValue * 100) / 100,
      gradedCount: data.gradedCount,
      calculatedAt: new Date(),
    };
  }

  /**
   * Récupère les séries temporelles
   */
  async getTimeSeries(userId: string, query: TimeSeriesQueryDto): Promise<TimeSeriesResponseDto> {
    const { startDate, endDate } = this.getPeriodDates(query);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const bucketFormat = this.getBucketFormat(query, query.bucket!);

    // Déterminer si on utilise purchaseDate ou createdAt
    const usePurchaseDate = query.type === PeriodType.ALL;

    // Pour les séries temporelles, on veut TOUJOURS voir l'évolution depuis le début
    // jusqu'à la fin de la période demandée
    const matchFilter: {
      ownerId: string;
      createdAt?: { $lte: Date };
    } = {
      ownerId: userId,
    };

    // Filtrer jusqu'à la date de fin de la période (si spécifiée)
    // Cela permet de voir l'évolution cumulative jusqu'à ce point
    if (endDate) {
      matchFilter.createdAt = { $lte: endDate };
    }

    const matchStage = { $match: matchFilter };

    // Pour la période "all", utiliser purchaseDate pour montrer l'historique d'acquisition réel
    const addFieldsStage = usePurchaseDate
      ? {
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
            // Utiliser purchaseDate si disponible, sinon createdAt
            effectiveDate: {
              $ifNull: ['$purchaseDate', '$createdAt'],
            },
            bucketDate: this.getBucketDateExpressionForDate(bucketFormat, 'effectiveDate'),
          },
        }
      : {
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
      query.metric === TimeSeriesMetric.COUNT
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

    // Calculer les valeurs cumulatives
    let cumulative = 0;
    const dataPoints: TimeSeriesDataPoint[] = data.map((item) => {
      cumulative += item.value;
      return {
        date: item._id,
        value: Math.round(cumulative * 100) / 100,
      };
    });

    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      metric: query.metric!,
      period: {
        type: query.type,
        year: query.year,
        month: query.month,
        week: query.week,
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      bucket: query.bucket!,
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
          } else if (snapshot.image.small) {
            // Priorité aux images small pour optimiser les performances
            imageUrl = snapshot.image.small;
          } else if (snapshot.image.large) {
            imageUrl = snapshot.image.large;
          }
        }

        // Mode A : prix direct
        if (item.purchasePrice !== undefined && item.purchasePrice > 0) {
          const card: ExpensiveCardItem = {
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
          return card;
        }

        // Mode B : chercher le variant le plus cher
        if (Array.isArray(item.variants) && item.variants.length > 0) {
          // Find the most expensive variant using a simple loop to avoid reduce type issues
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          let maxVariant = item.variants[0]!; // Safe: we checked length > 0
          for (let i = 1; i < item.variants.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const currentVariant = item.variants[i]!;
            const currentPrice = currentVariant.purchasePrice ?? 0;
            const maxPrice = maxVariant.purchasePrice ?? 0;
            if (currentPrice > maxPrice) {
              maxVariant = currentVariant;
            }
          }

          if (maxVariant.purchasePrice && maxVariant.purchasePrice > 0) {
            const card: ExpensiveCardItem = {
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
            return card;
          }
        }

        return null;
      })
      .filter((card): card is ExpensiveCardItem => card !== null);

    // Trier par prix décroissant et prendre les N premiers
    const topCards = cardsWithPrice.sort((a, b) => b.price - a.price).slice(0, limit);

    return { cards: topCards };
  }

  // ────────────────────────────────────────────────────────────
  // Méthodes utilitaires
  // ────────────────────────────────────────────────────────────

  /**
   * Calcule les dates de début et fin en fonction du filtre de période
   * Priorité: startDate/endDate (ISO strings) > type hiérarchique (year/month/week)
   */
  private getPeriodDates(filter: PeriodFilterDto): {
    startDate: Date | null;
    endDate: Date | null;
  } {
    // Priorité 1: Si startDate et/ou endDate sont fournis (ISO strings), les utiliser
    if (filter.startDate || filter.endDate) {
      const startDate = filter.startDate ? new Date(filter.startDate) : null;
      const endDate = filter.endDate ? new Date(filter.endDate) : null;
      return { startDate, endDate };
    }

    // Priorité 2: Utiliser le système hiérarchique (legacy)
    const now = new Date();
    const currentYear = filter.year || now.getFullYear();
    const currentMonth = filter.month !== undefined ? filter.month - 1 : now.getMonth();

    switch (filter.type) {
      case PeriodType.ALL:
        // Pas de filtre de date, retourne tout
        return { startDate: null, endDate: null };

      case PeriodType.YEAR: {
        // Début et fin de l'année spécifiée
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        return { startDate, endDate };
      }

      case PeriodType.MONTH: {
        // Début et fin du mois spécifié
        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate };
      }

      case PeriodType.WEEK: {
        // Calculer la semaine spécifiée dans le mois/année
        const weekNum = filter.week || 1;
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(1 + (weekNum - 1) * 7);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
      }

      default:
        return { startDate: null, endDate: null };
    }
  }

  /**
   * Détermine le format de bucket MongoDB approprié
   */
  private getBucketFormat(filter: PeriodFilterDto, bucket: TimeSeriesBucket): string {
    // Si c'est une semaine spécifique, utiliser le format journalier
    if (filter.type === PeriodType.WEEK) {
      return '%Y-%m-%d';
    }

    // Si c'est un mois spécifique, privilégier journalier ou hebdomadaire
    if (filter.type === PeriodType.MONTH) {
      return bucket === TimeSeriesBucket.DAILY ? '%Y-%m-%d' : '%Y-%U';
    }

    // Pour l'année ou tout, utiliser le bucket demandé
    switch (bucket) {
      case TimeSeriesBucket.DAILY:
        return '%Y-%m-%d';
      case TimeSeriesBucket.WEEKLY:
        return '%Y-%U';
      case TimeSeriesBucket.MONTHLY:
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  private getBucketDateExpression(format: string): Record<string, unknown> {
    return {
      $dateToString: {
        format,
        // Toujours utiliser createdAt pour les timeseries (date d'ajout au portfolio)
        date: '$createdAt',
      },
    };
  }

  private getBucketDateExpressionForDate(format: string, dateField: string): Record<string, unknown> {
    return {
      $dateToString: {
        format,
        date: `$${dateField}`,
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
