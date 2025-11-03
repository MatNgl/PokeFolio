import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { type UserRole } from '@pokefolio/types';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role!: UserRole;

  @Prop()
  refreshToken?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for faster email lookups
UserSchema.index({ email: 1 });
