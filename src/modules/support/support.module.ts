import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTicket, SupportTicketSchema } from './schemas/support-ticket.schema';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';
import { ChatsModule } from '../chats/chats.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SupportTicket.name, schema: SupportTicketSchema },
            { name: Announcement.name, schema: AnnouncementSchema },
        ]),
        ChatsModule,
    ],
    controllers: [SupportController],
    providers: [SupportService],
    exports: [SupportService],
})
export class SupportModule { }
