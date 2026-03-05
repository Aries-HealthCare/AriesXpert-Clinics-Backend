import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService, ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import { TherapistsModule } from "../therapists/therapists.module";
import { MongooseModule } from "@nestjs/mongoose";
import { ClinicsModule } from "../clinics/clinics.module";
import { EmailModule } from "../email/email.module";
import { OtpModule } from "../otp/otp.module";

@Module({
  imports: [
    UsersModule,
    forwardRef(() => TherapistsModule),
    ClinicsModule,
    EmailModule,
    PassportModule,
    OtpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>("JWT_SECRET") || "super_secure_secret",
        signOptions: { expiresIn: "7d" },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
