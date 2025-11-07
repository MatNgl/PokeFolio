import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters pour les top sets
 */
export class TopSetsQueryDto {
  @ApiProperty({
    description: 'Nombre de sets à retourner',
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 5;
}

/**
 * Information d'un set dans le top
 */
export class TopSetItem {
  @ApiProperty({
    description: 'ID du set',
    example: 'swsh12',
  })
  setId!: string;

  @ApiProperty({
    description: 'Nom du set',
    example: 'Silver Tempest',
  })
  setName!: string;

  @ApiProperty({
    description: 'Nombre de cartes de ce set dans la collection',
    example: 42,
  })
  cardCount!: number;

  @ApiProperty({
    description: 'Valeur totale des cartes de ce set',
    example: 1250.5,
  })
  totalValue!: number;
}

/**
 * Réponse pour les top sets
 */
export class TopSetsDto {
  @ApiProperty({
    description: 'Liste des top sets',
    type: [TopSetItem],
  })
  sets!: TopSetItem[];

  @ApiProperty({
    description: 'Nombre total de sets distincts dans la collection',
    example: 15,
  })
  totalSets!: number;
}
