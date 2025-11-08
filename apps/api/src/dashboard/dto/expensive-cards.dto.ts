import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters pour les cartes les plus chères
 */
export class ExpensiveCardsQueryDto {
  @ApiProperty({
    description: 'Nombre de cartes à retourner',
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
 * Information d'une carte chère
 */
export class ExpensiveCardItem {
  @ApiProperty({
    description: "ID de l'item du portfolio",
    example: '507f1f77bcf86cd799439011',
  })
  itemId!: string;

  @ApiProperty({
    description: 'ID de la carte',
    example: 'swsh12-123',
  })
  cardId!: string;

  @ApiProperty({
    description: 'Nom de la carte (depuis snapshot si disponible)',
    example: 'Charizard VMAX',
    required: false,
  })
  cardName?: string;

  @ApiProperty({
    description: "URL de l'image (depuis snapshot si disponible)",
    example: 'https://assets.tcgdex.net/fr/swsh12/123/high.png',
    required: false,
  })
  imageUrl?: string;

  @ApiProperty({
    description: "Prix d'achat",
    example: 450.99,
  })
  price!: number;

  @ApiProperty({
    description: 'Est gradée',
    example: true,
  })
  isGraded!: boolean;

  @ApiProperty({
    description: 'Compagnie de gradation (si gradée)',
    example: 'PSA',
    required: false,
  })
  gradeCompany?: string;

  @ApiProperty({
    description: 'Note de gradation (si gradée)',
    example: '10',
    required: false,
  })
  gradeScore?: string;

  @ApiProperty({
    description: 'Nom du set',
    example: 'Silver Tempest',
    required: false,
  })
  setName?: string;
}

/**
 * Réponse pour les cartes les plus chères
 */
export class ExpensiveCardsDto {
  @ApiProperty({
    description: 'Liste des cartes les plus chères',
    type: [ExpensiveCardItem],
  })
  cards!: ExpensiveCardItem[];
}
