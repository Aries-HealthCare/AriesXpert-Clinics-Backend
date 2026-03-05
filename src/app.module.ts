import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bull";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { TherapistsModule } from "./modules/therapists/therapists.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { CmsModule } from "./modules/cms/cms.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { AiModule } from "./modules/ai/ai.module";
import { AppController } from "./app.controller";
import { ApiRootController } from "./app.api.root.controller";
import { SosModule } from "./modules/sos/sos.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { WhatsAppModule } from "./modules/whatsapp/whatsapp.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { FileManagerModule } from "./modules/file-manager/file-manager.module";
import { BroadcastsModule } from "./modules/broadcasts/broadcasts.module";
import { TreatmentsModule } from "./modules/treatments/treatments.module";
import { ChatsModule } from "./modules/chats/chats.module";
import { PackagesModule } from "./modules/packages/packages.module";
import { TreatmentTypesModule } from "./modules/treatment-types/treatment-types.module";
import { RolesModule } from "./modules/roles/roles.module";
import { ClinicsModule } from "./modules/clinics/clinics.module";
import { FranchisesModule } from "./modules/franchises/franchises.module";
import { RoyaltiesModule } from "./modules/royalties/royalties.module";
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { SupportModule } from './modules/support/support.module';
import { EmailModule } from './modules/email/email.module';
import { RegistryModule } from './modules/registry/registry.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { MultitenancyModule } from './common/multitenancy/multitenancy.module';
import { ClinicDatabaseModule } from './common/clinic-database/clinic-database.module';
import { TenantMiddleware } from './common/multitenancy/tenant.middleware';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { FlashAlertsModule } from './modules/flash-alerts/flash-alerts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';


import { JwtModule } from '@nestjs/jwt';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { OtpModule } from './modules/otp/otp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri =
          configService.get<string>("MONGODB_URI") ||
          "mongodb://127.0.0.1:27017/AriesXpert";
        return { uri };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      connectionName: 'registry',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const baseUri = configService.get<string>("MONGODB_URI") || "mongodb://127.0.0.1:27017";
        // Connect to the 'clinics' registry database
        let uri = baseUri;
        if (uri.includes('?')) {
          const [base, query] = uri.split('?');
          const lastSlash = base.lastIndexOf('/');
          uri = `${base.substring(0, lastSlash)}/clinics?${query}`;
        } else {
          uri = uri.endsWith('/') ? `${uri}clinics` : `${uri}/clinics`;
        }
        return { uri };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    // CLINIC DATABASE MODULE - Provides all clinic-related models on the Main (ariesxpert) database
    ClinicDatabaseModule,

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get("REDIS_HOST") || "localhost",
          port: Number(configService.get("REDIS_PORT")) || 6379,
          password: configService.get("REDIS_PASSWORD"),
          username: configService.get("REDIS_USERNAME"),
          tls: configService.get("REDIS_TLS") === "true" ? {} : undefined,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    FinanceModule,
    LeadsModule,
    AppointmentsModule,
    ReferralsModule,
    PatientsModule,
    TherapistsModule,
    CommunicationModule,
    DashboardModule,
    // EmailModule MUST be imported before SettingsModule so that
    // EmailController's static 'settings/email' routes are registered
    // before SettingsController's parametric 'settings/:key' catch-all.
    EmailModule,
    SettingsModule,
    LocationsModule,
    CmsModule,
    AutomationModule,
    AiModule,
    SosModule,
    IntegrationsModule,
    WhatsAppModule,
    PaymentsModule,
    FileManagerModule,
    BroadcastsModule,
    TreatmentsModule,
    ChatsModule,
    PackagesModule,
    TreatmentTypesModule,
    RolesModule,
    ClinicsModule,
    FranchisesModule,
    RoyaltiesModule,
    AttendanceModule,
    PayrollModule,
    AssessmentsModule,
    SupportModule,
    RegistryModule,
    MultitenancyModule,
    IntelligenceModule,
    FlashAlertsModule,
    NotificationsModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'super_secret_fallback' }),
    OtpModule, // Shared JwtModule for middleware

  ],
  controllers: [AppController, ApiRootController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}

// Deployment trigger: 2026-03-04 13:58:00 (Flash Alerts Fix)
