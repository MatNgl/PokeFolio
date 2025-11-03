import { ApiProperty } from '@nestjs/swagger';
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

export class AddCardDto {
  @ApiProperty({ description: 'ID de la carte depuis Pokemon TCG API' })
  @IsString()
  @IsNotEmpty()
  cardId!: string;

  @ApiProperty({ description: 'Nom de la carte' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'ID du set', required: false })
  @IsString()
  @IsOptional()
  setId?: string;

  @ApiProperty({ description: 'Nom du set', required: false })
  @IsString()
  @IsOptional()
  setName?: string;

  @ApiProperty({ description: 'Numéro dans le set', required: false })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({ description: 'Rareté', required: false })
  @IsString()
  @IsOptional()
  rarity?: string;

  @ApiProperty({ description: 'URL image petite', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'URL image haute résolution', required: false })
  @IsString()
  @IsOptional()
  imageUrlHiRes?: string;

  @ApiProperty({ description: 'Types', required: false })
  @IsArray()
  @IsOptional()
  types?: string[];

  @ApiProperty({ description: 'Supertype', required: false })
  @IsString()
  @IsOptional()
  supertype?: string;

  @ApiProperty({ description: 'Subtypes', required: false })
  @IsArray()
  @IsOptional()
  subtypes?: string[];

  @ApiProperty({ description: 'Quantité', default: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Carte gradée', default: false })
  @IsBoolean()
  @IsOptional()
  isGraded?: boolean;

  @ApiProperty({ description: 'Entreprise de grading (PSA, BGS, CGC...)', required: false })
  @IsString()
  @IsOptional()
  gradeCompany?: string;

  @ApiProperty({ description: 'Note de grading (ex: 10, 9.5, 10+)', required: false })
  @IsString()
  @IsOptional()
  gradeScore?: string;

  @ApiProperty({ description: "Prix d'achat", required: false })
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @ApiProperty({ description: "Date d'achat", required: false })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiProperty({ description: 'Valeur actuelle estimée', required: false })
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiProperty({ description: 'Notes personnelles', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
