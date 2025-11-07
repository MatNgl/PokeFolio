import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * Types de métriques pour les séries temporelles
 */
export enum TimeSeriesMetric {
  COUNT = 'count',
  VALUE = 'value',
}

/**
 * Types de périodes hiérarchiques
 */
export enum PeriodType {
  ALL = 'all',
  YEAR = 'year',
  MONTH = 'month',
  WEEK = 'week',
}

/**
 * Périodes de temps disponibles (legacy - à supprimer progressivement)
 */
export enum TimeSeriesPeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  SIX_MONTHS = '6m',
  ONE_YEAR = '1y',
  CURRENT_MONTH = 'month',
  CURRENT_QUARTER = 'quarter',
  CURRENT_YEAR = 'year',
  ALL = 'all',
}

/**
 * Types de buckets pour l'agrégation temporelle
 */
export enum TimeSeriesBucket {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/**
 * Query parameters pour les périodes hiérarchiques
 */
export class PeriodFilterDto {
  @ApiProperty({
    description: 'Type de période',
    enum: PeriodType,
    default: PeriodType.ALL,
  })
  @IsEnum(PeriodType)
  @IsOptional()
  type?: PeriodType = PeriodType.ALL;

  @ApiProperty({
    description: 'Année spécifique (ex: 2024)',
    required: false,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Mois spécifique (1-12)',
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiProperty({
    description: 'Semaine spécifique (1-53)',
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(53)
  @IsOptional()
  week?: number;
}

/**
 * Query parameters pour les séries temporelles
 */
export class TimeSeriesQueryDto extends PeriodFilterDto {
  @ApiProperty({
    description: 'Métrique à afficher',
    enum: TimeSeriesMetric,
    default: TimeSeriesMetric.COUNT,
  })
  @IsEnum(TimeSeriesMetric)
  @IsOptional()
  metric?: TimeSeriesMetric = TimeSeriesMetric.COUNT;

  @ApiProperty({
    description: 'Type de bucket pour agrégation',
    enum: TimeSeriesBucket,
    default: TimeSeriesBucket.DAILY,
  })
  @IsEnum(TimeSeriesBucket)
  @IsOptional()
  bucket?: TimeSeriesBucket = TimeSeriesBucket.DAILY;
}

/**
 * Point de données pour une série temporelle
 */
export class TimeSeriesDataPoint {
  @ApiProperty({
    description: 'Date du point (ISO 8601)',
    example: '2025-01-15',
  })
  date!: string;

  @ApiProperty({
    description: 'Valeur de la métrique',
    example: 42,
  })
  value!: number;
}

/**
 * Réponse pour les séries temporelles
 */
export class TimeSeriesResponseDto {
  @ApiProperty({
    description: 'Métrique demandée',
    enum: TimeSeriesMetric,
  })
  metric!: TimeSeriesMetric;

  @ApiProperty({
    description: 'Filtre de période appliqué',
    type: PeriodFilterDto,
  })
  period!: PeriodFilterDto;

  @ApiProperty({
    description: 'Bucket utilisé',
    enum: TimeSeriesBucket,
  })
  bucket!: TimeSeriesBucket;

  @ApiProperty({
    description: 'Points de données',
    type: [TimeSeriesDataPoint],
  })
  data!: TimeSeriesDataPoint[];
}
