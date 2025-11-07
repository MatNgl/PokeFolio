import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters pour l'activité récente
 */
export class RecentActivityQueryDto {
  @ApiProperty({
    description: "Nombre d'activités à retourner",
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;
}

/**
 * Type d'activité
 */
export enum ActivityType {
  ADDED = 'added',
  UPDATED = 'updated',
}

/**
 * Activité récente sur un item du portfolio
 */
export class RecentActivityItem {
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
    example: 'Pikachu',
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
    description: "Type d'activité",
    enum: ActivityType,
  })
  type!: ActivityType;

  @ApiProperty({
    description: "Date de l'activité",
    example: '2025-01-15T14:30:00.000Z',
  })
  date!: Date;

  @ApiProperty({
    description: 'Quantité',
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Est gradée',
    example: false,
  })
  isGraded!: boolean;
}

/**
 * Réponse pour les activités récentes
 */
export class RecentActivityDto {
  @ApiProperty({
    description: 'Liste des activités récentes',
    type: [RecentActivityItem],
  })
  activities!: RecentActivityItem[];
}
