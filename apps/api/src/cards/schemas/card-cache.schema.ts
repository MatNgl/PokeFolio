import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CardCacheDocument = HydratedDocument<CardCache>;

@Schema({ timestamps: true })
export class CardCache {
  @Prop({ required: true, unique: true })
  cacheKey!: string;

  @Prop({ required: true, type: Object })
  data!: Record<string, unknown>;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const CardCacheSchema = SchemaFactory.createForClass(CardCache);

CardCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
