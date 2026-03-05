import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import {
  GlobalSetting,
  GlobalSettingSchema,
} from "./schemas/global-setting.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalSetting.name, schema: GlobalSettingSchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
