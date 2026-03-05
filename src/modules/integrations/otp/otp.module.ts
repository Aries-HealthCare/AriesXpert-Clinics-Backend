import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OTPRecord, OTPRecordSchema } from "./otp.model";
import { OTPService } from "./otp.service";
import { OTPController } from "./otp.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OTPRecord.name,
        schema: OTPRecordSchema,
      },
    ]),
  ],
  providers: [OTPService],
  controllers: [OTPController],
  exports: [OTPService],
})
export class OTPModule {}
