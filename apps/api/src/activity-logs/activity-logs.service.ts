import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogDoc, ActivityType } from './schemas/activity-log.schema';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name) private readonly activityLogModel: Model<ActivityLogDoc>
  ) {}

  async create(data: {
    userId: Types.ObjectId | string;
    userEmail: string;
    type: ActivityType;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ActivityLogDoc> {
    const log = new this.activityLogModel({
      userId: typeof data.userId === 'string' ? new Types.ObjectId(data.userId) : data.userId,
      userEmail: data.userEmail,
      type: data.type,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
    return log.save();
  }

  async findAll(options?: {
    limit?: number;
    skip?: number;
    userId?: string;
    type?: ActivityType;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: unknown[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (options?.userId) {
      query.userId = new Types.ObjectId(options.userId);
    }

    if (options?.type) {
      query.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = options.endDate;
      }
    }

    const limit = options?.limit ?? 50;
    const skip = options?.skip ?? 0;

    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
      this.activityLogModel.countDocuments(query).exec(),
    ]);

    return { logs: logs as unknown[], total };
  }

  async countByType(type: ActivityType, startDate?: Date, endDate?: Date): Promise<number> {
    const query: Record<string, unknown> = { type };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, unknown>).$gte = startDate;
      }
      if (endDate) {
        (query.createdAt as Record<string, unknown>).$lte = endDate;
      }
    }

    return this.activityLogModel.countDocuments(query).exec();
  }
}
