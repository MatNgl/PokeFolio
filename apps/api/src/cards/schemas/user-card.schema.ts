import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserCard extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  // Données de la carte
  @Prop({ required: true })
  cardId!: string; // ID TCGdex / Card.id

  @Prop({ required: true })
  name!: string;

  @Prop()
  setId?: string;

  @Prop()
  setName?: string;

  @Prop()
  number?: string; // localId

  @Prop()
  setCardCount?: number; // Nombre total de cartes dans le set

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

  // Données spécifiques utilisateur
  @Prop({ required: true, default: 1, min: 1 })
  quantity!: number;

  @Prop({ default: false })
  isGraded!: boolean;

  @Prop()
  gradeCompany?: string; // PSA, BGS, ...

  @Prop()
  gradeScore?: string; // string pour supporter "10+", "9.5", etc.

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
