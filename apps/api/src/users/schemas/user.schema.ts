import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type UserRole } from '@pokefolio/types';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true, unique: true, minlength: 3, maxlength: 24 })
  pseudo!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role!: UserRole;

  @Prop()
  refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
