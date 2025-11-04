import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddCardDto {
  @ApiProperty({
    description: 'Identifiant unique de la carte depuis TCGdex / Pokémon TCG API',
    example: 'sv3-189',
  })
  @IsString()
  @IsNotEmpty()
  cardId!: string;

  @ApiProperty({ description: 'Nom complet de la carte', example: 'Dracaufeu ex' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Identifiant du set', example: 'sv3' })
  @IsString()
  @IsOptional()
  setId?: string;

  @ApiPropertyOptional({ description: 'Nom du set', example: 'Écarlate & Violet 151' })
  @IsString()
  @IsOptional()
  setName?: string;

  @ApiPropertyOptional({ description: 'Numéro de la carte dans le set', example: '189' })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({ description: 'Nombre total de cartes dans le set', example: 165 })
  @IsNumber()
  @IsOptional()
  setCardCount?: number;

  @ApiPropertyOptional({ description: 'Rareté de la carte', example: 'Double Rare' })
  @IsString()
  @IsOptional()
  rarity?: string;

  @ApiPropertyOptional({ description: "URL d'image standard" })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "URL d'image haute résolution" })
  @IsString()
  @IsOptional()
  imageUrlHiRes?: string;

  @ApiPropertyOptional({ description: 'Types élémentaires de la carte', example: ['Feu'] })
  @IsArray()
  @IsOptional()
  types?: string[];

  @ApiPropertyOptional({ description: 'Supertype de la carte', example: 'Pokémon' })
  @IsString()
  @IsOptional()
  supertype?: string;

  @ApiPropertyOptional({ description: 'Sous-types de la carte', example: ['ex'] })
  @IsArray()
  @IsOptional()
  subtypes?: string[];

  @ApiProperty({ description: 'Quantité à ajouter', example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Carte gradée ?', example: false, default: false, required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isGraded?: boolean;

  @ApiPropertyOptional({
    description: 'Entreprise de gradation (PSA, BGS, CGC, etc.)',
    example: 'PSA',
  })
  @IsString()
  @IsOptional()
  gradeCompany?: string;

  @ApiPropertyOptional({ description: 'Note de gradation (ex. 10, 9.5, 10+)', example: '10' })
  @IsString()
  @IsOptional()
  gradeScore?: string;

  @ApiPropertyOptional({ description: "Prix d'achat en euros", example: 149.9 })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Date d'achat (format ISO 8601)", example: '2025-10-15' })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Valeur actuelle estimée en euros', example: 180 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Notes personnelles sur la carte' })
  @IsString()
  @IsOptional()
  notes?: string;
}
