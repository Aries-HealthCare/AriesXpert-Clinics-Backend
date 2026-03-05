import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ReferralsService } from "./referrals.service";
import { ReferralsController } from "./referrals.controller";
import { Referral, ReferralSchema } from "./schemas/referral.schema";
import { ReferralEarning, ReferralEarningSchema } from "./schemas/referral-earning.schema";
import { Therapist, TherapistSchema } from "../therapists/schemas/therapist.schema";
import { Patient, PatientSchema } from "../patients/schemas/patient.schema";
import { TherapistsModule } from "../therapists/therapists.module";
import { PatientsModule } from "../patients/patients.module";
import { UsersModule } from "../users/users.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { FinanceModule } from "../finance/finance.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Referral.name, schema: ReferralSchema },
            { name: ReferralEarning.name, schema: ReferralEarningSchema },
            { name: "Therapist", schema: TherapistSchema },
            { name: "Patient", schema: PatientSchema },
        ]),
        forwardRef(() => TherapistsModule),
        forwardRef(() => PatientsModule),
        forwardRef(() => UsersModule),
        forwardRef(() => AppointmentsModule),
        forwardRef(() => FinanceModule),
    ],
    controllers: [ReferralsController],
    providers: [ReferralsService],
    exports: [ReferralsService],
})
export class ReferralsModule { }
