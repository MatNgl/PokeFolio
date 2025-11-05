// apps/api/src/modules/portfolio/dto/add-card-variant.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradingDto } from '../../cards/dto/grading.dto';

export class AddCardVariantDto {
  @ApiPropertyOptional({ description: "Prix d'achat en euros (float accepté)", example: 149.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Date d'achat (ISO 8601)", example: '2025-10-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Issu de booster/scellé ?', example: false })
  @IsOptional()
  @IsBoolean()
  booster?: boolean;

  @ApiPropertyOptional({ description: 'Carte gradée ?', example: true })
  @IsOptional()
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
}
