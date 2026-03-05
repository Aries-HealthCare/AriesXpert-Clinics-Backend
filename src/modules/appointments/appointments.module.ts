import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { VisitsService } from "./visits.service";
import { VisitsController } from "./visits.controller";
import { Visit, VisitSchema } from "./schemas/visit.schema";
import { Assessment, AssessmentSchema } from "./schemas/assessment.schema";
import {
  LegacyTherapist,
  LegacyTherapistSchema,
} from "../therapists/schemas/legacy-therapist.schema";
import { FinanceModule } from "../finance/finance.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { ReferralsModule } from "../referrals/referrals.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Visit.name, schema: VisitSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: LegacyTherapist.name, schema: LegacyTherapistSchema },
    ]),
    FinanceModule,
    WhatsAppModule,
    forwardRef(() => ReferralsModule),
  ],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class AppointmentsModule { }
