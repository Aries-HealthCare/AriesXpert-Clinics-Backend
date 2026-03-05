import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    ) { }

    async getForUser(userId: string) {
        return this.notificationModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
    }

    async getForTherapist(therapistId: string) {
        return this.notificationModel
            .find({ therapistId: new Types.ObjectId(therapistId) })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
    }

    async markRead(id: string, userId: string) {
        return this.notificationModel.findOneAndUpdate(
            { _id: id, userId: new Types.ObjectId(userId) },
            { isRead: true },
            { new: true },
        );
    }

    async markAllRead(userId: string) {
        return this.notificationModel.updateMany(
            { userId: new Types.ObjectId(userId), isRead: false },
            { isRead: true },
        );
    }

    async deleteAll(userId: string) {
        return this.notificationModel.deleteMany({ userId: new Types.ObjectId(userId) });
    }

    async create(data: {
        userId: string;
        therapistId?: string;
        title: string;
        message: string;
        type?: string;
        meta?: Record<string, any>;
    }) {
        return this.notificationModel.create({
            userId: new Types.ObjectId(data.userId),
            therapistId: data.therapistId ? new Types.ObjectId(data.therapistId) : undefined,
            title: data.title,
            message: data.message,
            type: data.type ?? 'general',
            meta: data.meta,
        });
    }
}
