import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(email: string, passwordHash: string) {
    const user = new this.userModel({ email, passwordHash });
    return user.save();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    return this.userModel.findByIdAndUpdate(userId, { refreshToken }, { new: true }).exec();
  }

  toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
