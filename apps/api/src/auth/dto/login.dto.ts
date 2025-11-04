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
    example: 'StrongPassw0rd!',
  })
  @IsString()
  password!: string;

  @ApiProperty({
    description: 'Préférence côté UI (optionnel). Sans effet serveur en l’absence de refresh.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
