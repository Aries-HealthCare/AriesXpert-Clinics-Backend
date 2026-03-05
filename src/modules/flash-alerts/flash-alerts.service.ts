import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { FlashAlert, FlashAlertDocument } from "./schemas/flash-alert.schema";
import { FlashAlertReply, FlashAlertReplyDocument } from "./schemas/flash-alert-reply.schema";
import { Therapist, TherapistDocument } from "../therapists/schemas/therapist.schema";
import { PushNotificationsService } from "../broadcasts/push-notifications.service";

@Injectable()
export class FlashAlertsService {
    private readonly logger = new Logger(FlashAlertsService.name);

    constructor(
        @InjectModel(FlashAlert.name) private flashAlertModel: Model<FlashAlertDocument>,
        @InjectModel(FlashAlertReply.name) private replyModel: Model<FlashAlertReplyDocument>,
        @InjectModel(Therapist.name) private therapistModel: Model<TherapistDocument>,
        private readonly pushNotificationsService: PushNotificationsService,
    ) { }

    async createAndSend(dto: any, creatorId: string) {
        const { targeting, buttons, ...data } = dto;

        const flashAlert = new this.flashAlertModel({
            ...data,
            buttons,
            targeting,
            createdBy: new Types.ObjectId(creatorId),
            status: "ACTIVE"
        });

        // 1. Find matching therapists based on targeting
        const query: any = { isActive: true, isDeleted: false, fcmToken: { $exists: true, $ne: "" } };

        // Priority 1: Target specific therapists
        if (targeting.therapistIds && targeting.therapistIds.length > 0) {
            query._id = { $in: targeting.therapistIds.map(id => new Types.ObjectId(id)) };
        }

        // Priority 2: Geographic & Role targeting (refined by therapistIds if provided)
        if (targeting.city) query.city = new RegExp(targeting.city, "i");
        else if (targeting.state) query.state = new RegExp(targeting.state, "i");
        else if (targeting.country) query.country = new RegExp(targeting.country, "i");

        // Target by professionalRole (e.g., "Physiotherapist", "Nurse", etc.)
        if (targeting.professionalRole && targeting.professionalRole !== 'all') {
            query["professionalInfo.professionalRole"] = new RegExp(targeting.professionalRole, "i");
        }

        // Keep providerType mapping for backward compatibility with existing UI
        if (targeting.providerType && targeting.providerType !== 'all') {
            query["professionalInfo.professionalRole"] = new RegExp(targeting.providerType, "i");
        }

        if (targeting.filterOffline) {
            query.availability = "Offline";
        }

        if (targeting.filterLiability) {
            // High liability > 5k (from wallet or meta)
            query["wallet.balance"] = { $gt: 5000 };
        }

        this.logger.log(`Flash Alert targeting query: ${JSON.stringify(query)}`);
        const therapists = await this.therapistModel.find(query).select("_id fcmToken").lean();


        const fcmTokens = therapists.map(t => t.fcmToken).filter(Boolean);

        flashAlert.totalSent = fcmTokens.length;
        const saved = await flashAlert.save();

        // 2. Send Push Notifications
        if (fcmTokens.length > 0) {
            await this.pushNotificationsService.broadcastToMultiple(fcmTokens, {
                title: saved.title,
                body: saved.message,
                data: {
                    type: "flash_alert",
                    alertId: saved._id.toString(),
                    buttons: JSON.stringify(buttons),
                    title: saved.title,
                    message: saved.message
                }
            });
            this.logger.log(`Flash Alert ${saved._id} sent to ${fcmTokens.length} devices`);
        }

        return saved;
    }

    async findAll() {
        return this.flashAlertModel.find().sort({ createdAt: -1 }).exec();
    }

    async findOne(id: string) {
        const alert = await this.flashAlertModel.findById(id).exec();
        if (!alert) throw new NotFoundException("Flash Alert not found");

        const stats = await this.getStats(id);
        const logs = await this.replyModel
            .find({ flashAlertId: new Types.ObjectId(id) })
            .populate("therapistId", "firstName lastName phone profilePhoto")
            .sort({ createdAt: -1 })
            .limit(100)
            .exec();

        return { alert, stats, logs };
    }

    async saveReply(alertId: string, userId: string, buttonValue: string) {
        const alert = await this.flashAlertModel.findById(alertId);
        if (!alert) throw new NotFoundException("Flash Alert not found");

        const therapist = await this.therapistModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!therapist) throw new NotFoundException("Therapist profile not found");

        const button = alert.buttons.find(b => b.value === buttonValue);
        if (!button) throw new BadRequestException("Invalid button value");

        return this.replyModel.findOneAndUpdate(
            { flashAlertId: new Types.ObjectId(alertId), userId: new Types.ObjectId(userId) },
            {
                flashAlertId: new Types.ObjectId(alertId),
                userId: new Types.ObjectId(userId),
                therapistId: therapist._id,
                value: buttonValue,
                label: button.label,
                respondedAt: new Date()
            },
            { upsert: true, new: true }
        );
    }

    async getStats(id: string) {
        const alert = await this.flashAlertModel.findById(id);
        if (!alert) return [];

        const aggregations = await this.replyModel.aggregate([
            { $match: { flashAlertId: new Types.ObjectId(id) } },
            {
                $group: {
                    _id: "$value",
                    count: { $sum: 1 },
                    label: { $first: "$label" }
                }
            }
        ]);

        const totalReplies = aggregations.reduce((sum, item) => sum + item.count, 0);

        return aggregations.map(item => ({
            value: item._id,
            label: item.label,
            count: item.count,
            percentage: totalReplies > 0 ? Math.round((item.count / totalReplies) * 100) : 0
        }));
    }
}
