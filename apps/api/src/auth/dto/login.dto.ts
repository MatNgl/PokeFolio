import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Adresse email',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'Password123!',
  })
  @IsString()
  password!: string;

  @ApiProperty({
    description: 'Rester connecté (refresh token 30j)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
