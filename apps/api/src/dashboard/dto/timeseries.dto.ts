import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

/**
 * Types de métriques pour les séries temporelles
 */
export enum TimeSeriesMetric {
  COUNT = 'count',
  VALUE = 'value',
}

/**
 * Périodes de temps disponibles
 */
export enum TimeSeriesPeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  SIX_MONTHS = '6m',
  ONE_YEAR = '1y',
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
 * Query parameters pour les séries temporelles
 */
export class TimeSeriesQueryDto {
  @ApiProperty({
    description: 'Métrique à afficher',
    enum: TimeSeriesMetric,
    default: TimeSeriesMetric.COUNT,
  })
  @IsEnum(TimeSeriesMetric)
  @IsOptional()
  metric?: TimeSeriesMetric = TimeSeriesMetric.COUNT;

  @ApiProperty({
    description: 'Période de temps',
    enum: TimeSeriesPeriod,
    default: TimeSeriesPeriod.THIRTY_DAYS,
  })
  @IsIn(Object.values(TimeSeriesPeriod))
  @IsOptional()
  period?: TimeSeriesPeriod = TimeSeriesPeriod.THIRTY_DAYS;

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
    description: 'Période demandée',
    enum: TimeSeriesPeriod,
  })
  period!: TimeSeriesPeriod;

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
