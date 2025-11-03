import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { type CardLanguage } from '@pokefolio/types';

export class SearchCardsDto {
  @ApiProperty({
    description: 'Terme de recherche (nom de carte)',
    example: 'pikachu',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    description: 'Langue de recherche',
    enum: ['fr', 'en', 'ja', 'zh'],
    default: 'fr',
    required: false,
  })
  @IsOptional()
  @IsIn(['fr', 'en', 'ja', 'zh'])
  lang?: CardLanguage;

  @ApiProperty({
    description: 'Numéro de page',
    example: 1,
    default: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Nombre de résultats par page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
