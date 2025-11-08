import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityLogDoc = HydratedDocument<ActivityLog> & { _id: Types.ObjectId };

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CARD_ADDED = 'card_added',
  CARD_UPDATED = 'card_updated',
  CARD_DELETED = 'card_deleted',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
}

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  userEmail!: string;

  @Prop({ required: true, enum: Object.values(ActivityType) })
  type!: ActivityType;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Index pour recherche par user et date
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ type: 1, createdAt: -1 });
