import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({ description: "Adresse email de l'utilisateur", example: 'user@example.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiProperty({
    description: 'Pseudo (unique)',
    example: 'Pikachu123',
    minLength: 3,
    maxLength: 24,
  })
  @IsString()
  @Length(3, 24, { message: 'Le pseudo doit contenir entre 3 et 24 caractères' })
  pseudo!: string;

  @ApiProperty({
    description: 'Mot de passe (≥12 & ≥3 catégories: maj/min/chiffre/symbole)',
    example: 'StrongPassw0rd!',
    minLength: 12,
  })
  @IsString()
  @Length(12, 128, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
  @Matches(
    /^(?:(?=.*[a-z])(?=.*[A-Z])(?=.*\d)|(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])|(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])|(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])).+$/,
    { message: 'Le mot de passe doit contenir au moins 3 catégories: maj, min, chiffre, symbole' }
  )
  password!: string;

  @ApiProperty({ description: 'Confirmation du mot de passe', example: 'StrongPassw0rd!' })
  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  @Match('password', { message: 'La confirmation doit correspondre au mot de passe' })
  confirmPassword!: string;
}
