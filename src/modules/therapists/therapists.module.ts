import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TherapistsService } from "./therapists.service";
import { TherapistsController } from "./therapists.controller";
import { Therapist, TherapistSchema } from "./schemas/therapist.schema";
import { ExpertSchema } from "./schemas/expert.schema";
import { TherapistLegacySchema } from "./schemas/therapist_legacy.schema";
import { UsersModule } from "../users/users.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TherapistAuditLog, TherapistAuditLogSchema } from "./schemas/therapist-audit-log.schema";
import { TherapistFinancialAdjustment, TherapistFinancialAdjustmentSchema } from "./schemas/therapist-financial-adjustment.schema";
import { TherapistFraudLog, TherapistFraudLogSchema } from "./schemas/therapist-fraud-log.schema";
import { TherapistNotification, TherapistNotificationSchema } from "./schemas/therapist-notification.schema";
import { Ledger, LedgerSchema } from "../finance/schemas/ledger.schema";
import { Visit, VisitSchema } from "../visits/schemas/visit.schema";
import { AuthModule } from "../auth/auth.module";
import { ReferralsModule } from "../referrals/referrals.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Therapist.name, schema: TherapistSchema },
      { name: "Expert", schema: ExpertSchema },
      { name: "TherapistLegacy", schema: TherapistLegacySchema },
      { name: TherapistAuditLog.name, schema: TherapistAuditLogSchema },
      { name: TherapistFinancialAdjustment.name, schema: TherapistFinancialAdjustmentSchema },
      { name: TherapistFraudLog.name, schema: TherapistFraudLogSchema },
      { name: TherapistNotification.name, schema: TherapistNotificationSchema },
      { name: Ledger.name, schema: LedgerSchema },
      { name: Visit.name, schema: VisitSchema },
    ]),
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "secret",
        signOptions: { expiresIn: "1d" },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuthModule),
    forwardRef(() => ReferralsModule),
    EmailModule,
  ],
  controllers: [TherapistsController],
  providers: [TherapistsService],
  exports: [TherapistsService],
})
export class TherapistsModule { }
