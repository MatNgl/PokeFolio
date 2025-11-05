// apps/api/src/modules/portfolio/dto/create-portfolio-item-api.dto.ts
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
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradingDto } from '../../../cards/dto/grading.dto';
import type { CreatePortfolioItemDto, PortfolioVariant, CardLanguage } from '@pokefolio/types';

/**
 * DTO pour une variante avec prix en EUROS (API input)
 * Sera converti vers PortfolioVariant (prix en euros) avant stockage
 */
export class PortfolioVariantApiDto {
  @ApiPropertyOptional({ description: "Prix d'achat en euros", example: 149.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Date d'achat (ISO 8601)", example: '2025-10-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Issu de booster/scellé ?', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  booster?: boolean;

  @ApiPropertyOptional({ description: 'Carte gradée ?', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  graded?: boolean;

  @ApiPropertyOptional({ description: 'Infos de gradation', type: GradingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradingDto)
  grading?: GradingDto;

  @ApiPropertyOptional({ description: 'Notes personnelles' })
  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Convertit ce DTO API vers PortfolioVariant
   */
  toPortfolioVariant(): PortfolioVariant {
    return {
      purchasePrice: this.purchasePrice,
      purchaseDate: this.purchaseDate,
      booster: this.booster,
      graded: this.graded,
      grading: this.grading,
      notes: this.notes,
    };
  }
}

/**
 * DTO API pour créer un item portfolio - accepte les prix en EUROS
 * Sera converti vers CreatePortfolioItemDto (prix en euros) avant passage au service
 */
export class CreatePortfolioItemApiDto {
  @ApiProperty({ description: 'ID de la carte', example: 'sv3-189' })
  @IsString()
  @IsNotEmpty()
  cardId!: string;

  @ApiProperty({ description: 'Langue de la carte', example: 'fr' })
  @IsString()
  @IsNotEmpty()
  language!: CardLanguage;

  /* ----- Métadonnées de la carte (pour affichage) ----- */
  @ApiPropertyOptional({ description: 'Nom de la carte', example: 'Pikachu' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'ID du set', example: 'sv3' })
  @IsString()
  @IsOptional()
  setId?: string;

  @ApiPropertyOptional({ description: 'Nom du set', example: 'Obsidian Flames' })
  @IsString()
  @IsOptional()
  setName?: string;

  @ApiPropertyOptional({ description: 'Numéro de la carte', example: '189' })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({ description: 'Nombre de cartes dans le set', example: 230 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  setCardCount?: number;

  @ApiPropertyOptional({ description: 'Rareté de la carte', example: 'Rare Holo' })
  @IsString()
  @IsOptional()
  rarity?: string;

  @ApiPropertyOptional({ description: "URL de l'image (petite)", example: 'https://...' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "URL de l'image (haute résolution)", example: 'https://...' })
  @IsString()
  @IsOptional()
  imageUrlHiRes?: string;

  @ApiPropertyOptional({ description: 'Types de la carte', example: ['Lightning'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  types?: string[];

  @ApiPropertyOptional({ description: 'Supertype de la carte', example: 'Pokémon' })
  @IsString()
  @IsOptional()
  supertype?: string;

  @ApiPropertyOptional({ description: 'Subtypes de la carte', example: ['Basic'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subtypes?: string[];

  /* ----- Mode A : même données pour toutes ----- */
  @ApiPropertyOptional({
    description: 'Quantité (obligatoire en Mode A, ignoré en Mode B)',
    example: 1,
    minimum: 1,
  })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Issu de booster/scellé ?', example: false })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  booster?: boolean;

  @ApiPropertyOptional({ description: 'Carte gradée ?', example: false })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  graded?: boolean;

  @ApiPropertyOptional({ description: 'Infos de gradation', type: GradingDto })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @ValidateNested()
  @Type(() => GradingDto)
  @IsOptional()
  grading?: GradingDto;

  @ApiPropertyOptional({ description: "Prix d'achat unitaire en euros", example: 149.9 })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Date d'achat (ISO 8601)", example: '2025-10-15' })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Notes personnelles' })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @IsString()
  @IsOptional()
  notes?: string;

  /* ----- Mode B : variantes distinctes ----- */
  @ApiPropertyOptional({
    description: 'Variantes (Mode B)',
    type: [PortfolioVariantApiDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioVariantApiDto)
  @IsOptional()
  variants?: PortfolioVariantApiDto[];

  /**
   * Convertit ce DTO API vers CreatePortfolioItemDto
   */
  toCreateDto(): CreatePortfolioItemDto {
    // Mode B : variantes
    if (this.variants && this.variants.length > 0) {
      return {
        cardId: this.cardId,
        language: this.language,
        variants: this.variants.map((v) => v.toPortfolioVariant()),
      };
    }

    // Mode A : données unitaires
    return {
      cardId: this.cardId,
      language: this.language,
      quantity: this.quantity ?? 1,
      booster: this.booster,
      graded: this.graded,
      grading: this.grading,
      purchasePrice: this.purchasePrice,
      purchaseDate: this.purchaseDate,
      notes: this.notes,
    };
  }
}
