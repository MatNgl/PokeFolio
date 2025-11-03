import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserCard extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  // Données de la carte Pokemon TCG API
  @Prop({ required: true })
  cardId!: string; // ID de l'API Pokemon TCG

  @Prop({ required: true })
  name!: string;

  @Prop()
  setId?: string;

  @Prop()
  setName?: string;

  @Prop()
  number?: string;

  @Prop()
  rarity?: string;

  @Prop()
  imageUrl?: string;

  @Prop()
  imageUrlHiRes?: string;

  @Prop()
  types?: string[];

  @Prop()
  supertype?: string;

  @Prop()
  subtypes?: string[];

  // Données spécifiques à l'utilisateur
  @Prop({ required: true, default: 1, min: 1 })
  quantity!: number;

  @Prop({ default: false })
  isGraded!: boolean;

  @Prop()
  gradeCompany?: string; // PSA, BGS, CGC, etc.

  @Prop()
  gradeScore?: string;

  @Prop()
  purchasePrice?: number;

  @Prop()
  purchaseDate?: Date;

  @Prop()
  currentValue?: number;

  @Prop()
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserCardSchema = SchemaFactory.createForClass(UserCard);

// Index pour optimiser les requêtes
UserCardSchema.index({ userId: 1, cardId: 1 });
UserCardSchema.index({ userId: 1, createdAt: -1 });
