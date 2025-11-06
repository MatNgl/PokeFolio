import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserCardDocument = HydratedDocument<UserCard>;

@Schema({ timestamps: true })
export class UserCard {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  // Métadonnées carte
  @Prop({ required: true })
  cardId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop() setId?: string;
  @Prop() setName?: string;
  @Prop() number?: string;
  @Prop() setCardCount?: number;
  @Prop() rarity?: string;
  @Prop() imageUrl?: string;
  @Prop() imageUrlHiRes?: string;
  @Prop() types?: string[];
  @Prop() supertype?: string;
  @Prop() subtypes?: string[];

  // Données utilisateur
  @Prop({ required: true, default: 1, min: 1 })
  quantity!: number;

  @Prop({ default: false })
  isGraded!: boolean;

  @Prop() gradeCompany?: string;
  @Prop() gradeScore?: string;
  @Prop() purchasePrice?: number;
  @Prop() purchaseDate?: Date;
  @Prop() currentValue?: number;
  @Prop() notes?: string;
}

export const UserCardSchema = SchemaFactory.createForClass(UserCard);

// 👍 Conserver les indexes utiles, mais rends le composé unique
UserCardSchema.index({ userId: 1, cardId: 1 }, { unique: true });
UserCardSchema.index({ userId: 1, createdAt: -1 });
