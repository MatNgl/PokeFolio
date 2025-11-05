// apps/api/src/cards/dto/grading.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { GradingCompany } from '@pokefolio/types';

const GRADING_COMPANIES = ['PSA', 'CollectAura', 'BGS', 'CGC', 'PCA', 'Other'] as const;

/**
 * DTO pour les informations de gradation d'une carte
 * Compatible avec GradingInfo du package @pokefolio/types
 */
export class GradingDto {
  @ApiPropertyOptional({
    description: 'Entreprise de gradation',
    example: 'PSA',
    enum: GRADING_COMPANIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(GRADING_COMPANIES)
  company?: GradingCompany;

  @ApiPropertyOptional({
    description: 'Note de gradation (peut être numérique ou alphanumérique)',
    example: '10',
  })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({
    description: 'Numéro de certification de la carte gradée',
    example: '12345678',
  })
  @IsOptional()
  @IsString()
  certificationNumber?: string;
}
