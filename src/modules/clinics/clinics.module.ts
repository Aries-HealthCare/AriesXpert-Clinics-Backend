import { Module } from "@nestjs/common";
import { ClinicsController } from "./clinics.controller";
import { PublicClinicsController } from "./public-clinics.controller";
import { ClinicsService } from "./clinics.service";
import { ClinicUsersService } from "./clinic-users.service";
import { ClinicUsersController } from "./clinic-users.controller";
import { UsersModule } from "../users/users.module";
import { EmailModule } from "../email/email.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { ClinicPortalController } from "./clinic-portal.controller";
import { FounderClinicsController } from "./founder-clinics.controller";
import { ClinicDataController } from "./controllers/clinic-data.controller";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

// NOTE: Clinic and ClinicUser schemas are provided via the global ClinicDatabaseModule.
// ClinicDataController uses @InjectConnection() to access all clinic_* collections directly.

@Module({
  imports: [
    UsersModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "super_secure_secret",
        signOptions: { expiresIn: "1h" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    ClinicsController,
    FounderClinicsController,
    PublicClinicsController,
    DashboardController,
    ClinicPortalController,
    ClinicUsersController,
    ClinicDataController,   // ← New isolated clinic data endpoints
  ],
  providers: [ClinicsService, DashboardService, ClinicUsersService],
  exports: [ClinicsService, ClinicUsersService],
})
export class ClinicsModule { }
