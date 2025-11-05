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
    description: 'Mot de passe (≥6, 1 majuscule, 1 caractère spécial)',
    example: 'Azerty!',
    minLength: 6,
  })
  @IsString()
  @Length(6, 128, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule et un caractère spécial',
  })
  password!: string;

  @ApiProperty({ description: 'Confirmation du mot de passe', example: 'Azerty!' })
  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  @Match('password', { message: 'La confirmation doit correspondre au mot de passe' })
  confirmPassword!: string;
}
