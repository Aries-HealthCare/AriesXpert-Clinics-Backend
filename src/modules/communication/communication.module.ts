import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BroadcastsService } from "./broadcasts.service";
import { BroadcastsController } from "./broadcasts.controller";
import { Announcement, AnnouncementSchema } from "./schemas/announcement.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService],
  exports: [BroadcastsService],
})
export class CommunicationModule { }
