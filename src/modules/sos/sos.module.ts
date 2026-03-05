import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SosController } from './sos.controller';
import { SosService } from './sos.service';
import { SosSession, SosSessionSchema, SosLocationLog, SosLocationLogSchema, SosActivityLog, SosActivityLogSchema } from './sos.schema';
import { SosGateway } from './sos.gateway';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SosSession.name, schema: SosSessionSchema },
      { name: SosLocationLog.name, schema: SosLocationLogSchema },
      { name: SosActivityLog.name, schema: SosActivityLogSchema },
    ]),
    OtpModule,
  ],
  controllers: [SosController],
  providers: [SosService, SosGateway],
  exports: [SosService, SosGateway],
})
export class SosModule { }
