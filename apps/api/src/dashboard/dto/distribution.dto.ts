import { ApiProperty } from '@nestjs/swagger';

/**
 * Distribution par compagnie de gradation
 */
export class GradeCompanyDistribution {
  @ApiProperty({
    description: 'Nom de la compagnie (PSA, BGS, CGC, etc.)',
    example: 'PSA',
  })
  company!: string;

  @ApiProperty({
    description: 'Nombre de cartes gradées par cette compagnie',
    example: 15,
  })
  count!: number;

  @ApiProperty({
    description: 'Pourcentage du total',
    example: 45.5,
  })
  percentage!: number;
}

/**
 * Réponse pour la distribution gradé vs non gradé
 */
export class GradeDistributionDto {
  @ApiProperty({
    description: 'Nombre de cartes gradées',
    example: 33,
  })
  graded!: number;

  @ApiProperty({
    description: 'Nombre de cartes non gradées',
    example: 117,
  })
  normal!: number;

  @ApiProperty({
    description: 'Nombre total de cartes',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Pourcentage de cartes gradées',
    example: 22,
  })
  gradedPercentage!: number;

  @ApiProperty({
    description: 'Distribution par compagnie de gradation',
    type: [GradeCompanyDistribution],
  })
  byCompany!: GradeCompanyDistribution[];
}
