import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiProperty({
    description: 'Mot de passe (min 8 caractères, avec majuscule et caractère spécial)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*[@$!%*?&])/, {
    message: 'Le mot de passe doit contenir au moins une majuscule et un caractère spécial',
  })
  password!: string;
}
