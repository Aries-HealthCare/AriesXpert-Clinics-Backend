import { Module } from "@nestjs/common";
import { GoogleMapsController } from "./google-maps.controller";
import { GoogleMeetController } from "./google-meet.controller";
import { SettingsModule } from "../settings/settings.module";
import { ExotelController } from "./exotel.controller";
import { ExotelService } from "./exotel.service";

@Module({
  imports: [SettingsModule],
  controllers: [GoogleMapsController, GoogleMeetController, ExotelController],
  providers: [ExotelService],
})
export class IntegrationsModule {}
