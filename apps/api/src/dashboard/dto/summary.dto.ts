import { ApiProperty } from '@nestjs/swagger';
import { PeriodFilterDto } from './timeseries.dto';

/**
 * Query parameters pour le résumé
 */
export class SummaryQueryDto extends PeriodFilterDto {}

/**
 * Résumé des KPIs du dashboard
 */
export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Nombre total de cartes (avec duplicatas)',
    example: 150,
  })
  totalCards!: number;

  @ApiProperty({
    description: 'Nombre de cartes distinctes (uniques)',
    example: 87,
  })
  distinctCards!: number;

  @ApiProperty({
    description: 'Nombre de sets distincts',
    example: 25,
  })
  totalSets!: number;

  @ApiProperty({
    description: 'Valeur totale de la collection',
    example: 5432.5,
  })
  totalValue!: number;

  @ApiProperty({
    description: 'Nombre de cartes gradées',
    example: 42,
  })
  gradedCount!: number;

  @ApiProperty({
    description: 'Date de calcul',
    example: '2025-01-15T10:30:00.000Z',
  })
  calculatedAt!: Date;
}
