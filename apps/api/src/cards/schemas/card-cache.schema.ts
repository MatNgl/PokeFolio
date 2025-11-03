import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CardCache extends Document {
  @Prop({ required: true, unique: true })
  cacheKey!: string;

  @Prop({ required: true, type: Object })
  data!: Record<string, unknown>;

  @Prop({ required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CardCacheSchema = SchemaFactory.createForClass(CardCache);

// Index TTL pour auto-suppression après expiration
CardCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CardCacheSchema.index({ cacheKey: 1 }, { unique: true });
