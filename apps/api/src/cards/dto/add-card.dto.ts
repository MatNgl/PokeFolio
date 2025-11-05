// apps/api/src/cards/dto/add-card.dto.ts
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
  ValidateIf,
  ValidateNested,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddCardVariantDto } from './add-card-variant.dto';
import { GradingDto } from './grading.dto';

/**
 * Validateur personnalisé pour s'assurer qu'on n'utilise pas Mode A et Mode B en même temps
 */
@ValidatorConstraint({ name: 'ModeExclusivity', async: false })
export class ModeExclusivityConstraint implements ValidatorConstraintInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate(_value: any, args: ValidationArguments) {
    const obj = args.object as AddCardDto;
    const isModeB = Array.isArray(obj.variants) && obj.variants.length > 0;
    return !(isModeB && obj.quantity !== undefined);
  }
  defaultMessage(): string {
    return 'Ne pas fournir quantity en Mode B (variantes) - il sera calculé automatiquement';
  }
}

export class AddCardDto {
  /* ----- Métadonnées carte (inchangé) ----- */
  @ApiProperty({ description: 'Identifiant unique de la carte', example: 'sv3-189' })
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

  @ApiPropertyOptional({ description: 'Numéro dans le set', example: '189' })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({ description: 'Taille du set', example: 165 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  setCardCount?: number;

  @ApiPropertyOptional({ description: 'Rareté', example: 'Double Rare' })
  @IsString()
  @IsOptional()
  rarity?: string;

  @ApiPropertyOptional({ description: "URL d'image" })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'URL image HD' })
  @IsString()
  @IsOptional()
  imageUrlHiRes?: string;

  @ApiPropertyOptional({ description: 'Types', example: ['Feu'] })
  @IsArray()
  @IsOptional()
  types?: string[];

  @ApiPropertyOptional({ description: 'Supertype', example: 'Pokémon' })
  @IsString()
  @IsOptional()
  supertype?: string;

  @ApiPropertyOptional({ description: 'Sous-types', example: ['ex'] })
  @IsArray()
  @IsOptional()
  subtypes?: string[];

  /* ----- Mode A : même données pour toutes ----- */
  @ApiPropertyOptional({
    description: 'Quantité (obligatoire en Mode A, ignoré en Mode B car déduit de variants.length)',
    example: 1,
    minimum: 1,
  })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Validate(ModeExclusivityConstraint)
  quantity?: number;

  @ApiPropertyOptional({ description: "Carte issue d'un booster/scellé ?", example: false })
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

  @ApiPropertyOptional({
    description: 'Informations de gradation (Mode A uniquement)',
    type: GradingDto,
  })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @ValidateNested()
  @Type(() => GradingDto)
  @IsOptional()
  grading?: GradingDto;

  @ApiPropertyOptional({
    description: "Prix d'achat unitaire en euros (float accepté)",
    example: 149.99,
  })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Date d'achat (ISO 8601)", example: '2025-10-15' })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({
    description: 'Valeur estimée en euros (non stockée côté backend actuellement)',
    example: 180,
  })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Notes personnelles' })
  @ValidateIf((o) => !o.variants || o.variants.length === 0)
  @IsString()
  @IsOptional()
  notes?: string;

  /* ----- Mode B : variantes distinctes (quantity implicite) ----- */
  @ApiPropertyOptional({
    description: 'Variantes (une par carte, prix/date/gradation distincts)',
    type: [AddCardVariantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddCardVariantDto)
  @IsOptional()
  variants?: AddCardVariantDto[];
}
