import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsString, IsOptional, Min, Max, IsDateString } from 'class-validator';

export class UpdateCardDto {
  @ApiProperty({ description: 'Quantité', required: false, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Carte gradée', required: false })
  @IsBoolean()
  @IsOptional()
  isGraded?: boolean;

  @ApiProperty({ description: 'Entreprise de grading (PSA, BGS, CGC...)', required: false })
  @IsString()
  @IsOptional()
  gradeCompany?: string;

  @ApiProperty({ description: 'Note de grading (1-10)', required: false, minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  gradeScore?: number;

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
