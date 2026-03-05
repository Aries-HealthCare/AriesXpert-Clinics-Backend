import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailSetting, EmailSettingSchema } from './schemas/email-setting.schema';
import { EmailLog, EmailLogSchema } from './schemas/email-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailSetting.name, schema: EmailSettingSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
    ]),
  ],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule { }
