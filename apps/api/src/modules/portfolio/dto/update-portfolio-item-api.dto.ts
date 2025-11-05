// apps/api/src/modules/portfolio/dto/update-portfolio-item-api.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradingDto } from '../../../cards/dto/grading.dto';
import type { UpdatePortfolioItemDto, PortfolioVariant, CardLanguage } from '@pokefolio/types';

/**
 * DTO pour une variante avec prix en EUROS (API input) - Update
 */
export class PortfolioVariantUpdateApiDto {
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
 * DTO API pour mettre à jour un item portfolio - accepte les prix en EUROS
 */
export class UpdatePortfolioItemApiDto {
  @ApiPropertyOptional({ description: 'Langue de la carte', example: 'fr' })
  @IsOptional()
  @IsString()
  language?: CardLanguage;

  @ApiPropertyOptional({ description: 'Quantité', example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Issu de booster/scellé ?', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  booster?: boolean;

  @ApiPropertyOptional({ description: 'Carte gradée ?', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  graded?: boolean;

  @ApiPropertyOptional({ description: 'Infos de gradation', type: GradingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradingDto)
  grading?: GradingDto;

  @ApiPropertyOptional({ description: "Prix d'achat unitaire en euros", example: 149.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Date d'achat (ISO 8601)", example: '2025-10-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Notes personnelles' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Variantes (remplace toutes les variantes existantes)',
    type: [PortfolioVariantUpdateApiDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioVariantUpdateApiDto)
  variants?: PortfolioVariantUpdateApiDto[];

  /**
   * Convertit ce DTO API vers UpdatePortfolioItemDto
   */
  toUpdateDto(): UpdatePortfolioItemDto {
    const dto: UpdatePortfolioItemDto = {};

    if (this.language !== undefined) dto.language = this.language;
    if (this.quantity !== undefined) dto.quantity = this.quantity;
    if (this.booster !== undefined) dto.booster = this.booster;
    if (this.graded !== undefined) dto.graded = this.graded;
    if (this.grading !== undefined) dto.grading = this.grading;
    if (this.purchasePrice !== undefined) dto.purchasePrice = this.purchasePrice;
    if (this.purchaseDate !== undefined) dto.purchaseDate = this.purchaseDate;
    if (this.notes !== undefined) dto.notes = this.notes;
    if (this.variants !== undefined) {
      dto.variants = this.variants.map((v) => v.toPortfolioVariant());
    }

    return dto;
  }
}
