import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { CryptoService } from './crypto.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

type UserDto = ReturnType<UsersService['toUserResponse']>;
export interface AuthResult {
  // <= export !
  user: UserDto;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('La confirmation doit correspondre au mot de passe');
    }

    const email = dto.email.trim().toLowerCase();
    const pseudo = dto.pseudo.trim();

    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) throw new ConflictException('Cet email est déjà utilisé');

    const existingByPseudo = await this.usersService.findByPseudo(pseudo);
    if (existingByPseudo) throw new ConflictException('Ce pseudo est déjà utilisé');

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
    const user = await this.usersService.create(email, pseudo, passwordHash);

    const accessToken = this.generateAccessToken(user);
    return { user: this.usersService.toUserResponse(user), accessToken };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email.trim().toLowerCase());
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');

    const isPasswordValid = await this.cryptoService.verifyPassword(
      user.passwordHash,
      dto.password
    );
    if (!isPasswordValid) throw new UnauthorizedException('Email ou mot de passe incorrect');

    const accessToken = this.generateAccessToken(user);
    return { user: this.usersService.toUserResponse(user), accessToken };
  }

  async logout(_userId: string): Promise<void> {
    return;
  }

  private generateAccessToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '100d'), // 100 jours
    });
  }
}
