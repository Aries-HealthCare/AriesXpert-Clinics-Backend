import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TreatmentsService } from "./treatments.service";
import { TreatmentAutomationService } from "./treatment-automation.service";
import { TreatmentsController } from "./treatments.controller";
import { Treatment, TreatmentSchema } from "./schemas/treatment.schema";
import { Patient, PatientSchema } from "../patients/schemas/patient.schema";
import { Visit, VisitSchema } from "../appointments/schemas/visit.schema";
import {
  Therapist,
  TherapistSchema,
} from "../therapists/schemas/therapist.schema";
import {
  LegacyTherapist,
  LegacyTherapistSchema,
} from "../therapists/schemas/legacy-therapist.schema";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Treatment.name, schema: TreatmentSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Therapist.name, schema: TherapistSchema },
      { name: LegacyTherapist.name, schema: LegacyTherapistSchema },
    ]),
    WhatsAppModule,
  ],
  controllers: [TreatmentsController],
  providers: [TreatmentsService, TreatmentAutomationService],
  exports: [TreatmentsService, TreatmentAutomationService],
})
export class TreatmentsModule { }
