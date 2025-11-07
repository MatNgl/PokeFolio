import { ApiProperty } from '@nestjs/swagger';

/**
 * Variation d'une métrique par rapport à la période précédente
 */
export class MetricChange {
  @ApiProperty({
    description: 'Valeur de la métrique',
    example: 150,
  })
  value!: number;

  @ApiProperty({
    description: 'Changement en pourcentage par rapport à la période précédente',
    example: 12.5,
  })
  percentChange!: number;

  @ApiProperty({
    description: 'Valeur de la période précédente',
    example: 133,
  })
  previousValue!: number;
}

/**
 * Résumé des KPIs du dashboard
 */
export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Nombre total de cartes',
    type: MetricChange,
  })
  totalCards!: MetricChange;

  @ApiProperty({
    description: 'Nombre de sets distincts',
    type: MetricChange,
  })
  totalSets!: MetricChange;

  @ApiProperty({
    description: 'Valeur totale de la collection',
    type: MetricChange,
  })
  totalValue!: MetricChange;

  @ApiProperty({
    description: 'Nombre de cartes gradées',
    type: MetricChange,
  })
  gradedCount!: MetricChange;

  @ApiProperty({
    description: 'Date de calcul',
    example: '2025-01-15T10:30:00.000Z',
  })
  calculatedAt!: Date;
}
