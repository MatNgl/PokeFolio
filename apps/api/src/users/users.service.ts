import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDoc } from './schemas/user.schema';
import type { AuthUser } from '@pokefolio/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>
  ) {}

  findById(id: string): Promise<UserDoc | null> {
    // Pas de .lean() -> on veut un document hydraté
    return this.userModel.findById(id).exec() as Promise<UserDoc | null>;
  }

  findByEmail(email: string): Promise<UserDoc | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .exec() as Promise<UserDoc | null>;
  }

  findByPseudo(pseudo: string): Promise<UserDoc | null> {
    return this.userModel.findOne({ pseudo: pseudo.trim() }).exec() as Promise<UserDoc | null>;
  }

  create(email: string, pseudo: string, passwordHash: string): Promise<UserDoc> {
    return this.userModel.create({
      email: email.toLowerCase().trim(),
      pseudo: pseudo.trim(),
      passwordHash,
      role: 'user',
    }) as Promise<UserDoc>;
  }

  updatePseudo(userId: string, newPseudo: string): Promise<UserDoc | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { pseudo: newPseudo.trim() }, { new: true })
      .exec() as Promise<UserDoc | null>;
  }

  updatePassword(userId: string, newPasswordHash: string): Promise<UserDoc | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { passwordHash: newPasswordHash }, { new: true })
      .exec() as Promise<UserDoc | null>;
  }

  toUserResponse(user: UserDoc): AuthUser {
    // Mongoose ajoute .id (string) basé sur _id
    const { id, email, pseudo, role } = user;
    return { id, email, pseudo, role };
  }
}
