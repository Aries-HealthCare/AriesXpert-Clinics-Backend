import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BroadcastsController } from "./broadcasts.controller";
import { BroadcastsService } from "./broadcasts.service";
import { Broadcast, BroadcastSchema } from "./schemas/broadcast.schema";
import { BroadcastListing, BroadcastListingSchema } from "./schemas/broadcast-listing.schema";
import { Lead, LeadSchema } from "../leads/schemas/lead.schema";
import { Visit, VisitSchema } from "../appointments/schemas/visit.schema";
import { Patient, PatientSchema } from "../patients/schemas/patient.schema";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { AiModule } from "../ai/ai.module";
import {
  Therapist,
  TherapistSchema,
} from "../therapists/schemas/therapist.schema";
import { User, UserSchema } from "../users/schemas/user.schema";

import { PushNotificationsService } from "./push-notifications.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Broadcast.name, schema: BroadcastSchema },
      { name: BroadcastListing.name, schema: BroadcastListingSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Therapist.name, schema: TherapistSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WhatsAppModule,
    AiModule,
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, PushNotificationsService],
  exports: [BroadcastsService, PushNotificationsService],
})
export class BroadcastsModule { }
