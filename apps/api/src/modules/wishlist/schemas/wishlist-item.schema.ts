import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WishlistItemDocument = WishlistItem & Document;

@Schema({ timestamps: true })
export class WishlistItem {
  @Prop({ required: true })
  ownerId!: string;

  @Prop({ required: true })
  cardId!: string;

  @Prop({ type: Object })
  cardSnapshot?: {
    name?: string;
    set?: {
      id?: string;
      name?: string;
      logo?: string;
      symbol?: string;
      releaseDate?: string;
    };
    number?: string;
    rarity?: string;
    imageUrl?: string;
    imageUrlHiRes?: string;
    types?: string[];
    category?: string;
  };

  @Prop()
  priority?: 'low' | 'medium' | 'high';

  @Prop()
  targetPrice?: number;

  @Prop()
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

// Index pour rechercher rapidement les items d'un utilisateur
WishlistItemSchema.index({ ownerId: 1, cardId: 1 }, { unique: true });
