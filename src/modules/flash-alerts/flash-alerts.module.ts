import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlashAlertsController } from "./flash-alerts.controller";
import { FlashAlertsService } from "./flash-alerts.service";
import { FlashAlert, FlashAlertSchema } from "./schemas/flash-alert.schema";
import { FlashAlertReply, FlashAlertReplySchema } from "./schemas/flash-alert-reply.schema";
import { Therapist, TherapistSchema } from "../therapists/schemas/therapist.schema";
import { BroadcastsModule } from "../broadcasts/broadcasts.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FlashAlert.name, schema: FlashAlertSchema },
            { name: FlashAlertReply.name, schema: FlashAlertReplySchema },
            { name: Therapist.name, schema: TherapistSchema },
        ]),
        BroadcastsModule, // For PushNotificationsService
    ],
    controllers: [FlashAlertsController],
    providers: [FlashAlertsService],
    exports: [FlashAlertsService],
})
export class FlashAlertsModule { }
