import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { User } from './schemas/user.schema';
import type { AuthUser } from '@pokefolio/types';

type UserDoc = User & Document;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDoc>
  ) {}

  async findById(id: string): Promise<UserDoc | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDoc | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByPseudo(pseudo: string): Promise<UserDoc | null> {
    return this.userModel.findOne({ pseudo: pseudo.trim() }).exec();
  }

  async create(email: string, pseudo: string, passwordHash: string): Promise<UserDoc> {
    return this.userModel.create({
      email: email.toLowerCase().trim(),
      pseudo: pseudo.trim(),
      passwordHash,
      role: 'user',
    });
  }

  async updatePseudo(userId: string, newPseudo: string): Promise<UserDoc | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { pseudo: newPseudo.trim() }, { new: true })
      .exec();
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<UserDoc | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { passwordHash: newPasswordHash }, { new: true })
      .exec();
  }

  toUserResponse(user: UserDoc): AuthUser {
    return {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo, // ✅ plus de "username"
      role: user.role,
    };
  }
}
