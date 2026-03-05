import {
    Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request
} from '@nestjs/common';
import { SupportService } from './support.service';
import { ChatsService } from '../chats/chats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(
        private readonly supportService: SupportService,
        private readonly chatsService: ChatsService,
    ) { }

    // ─── Live Chat (proxied from ChatsService) ────────────────────────────────

    @Get('chats')
    async getChats(@Request() req) {
        return this.chatsService.getUserChats(req.user.userId);
    }

    @Post('chats')
    async createChat(@Body() body: { participantId: string }, @Request() req) {
        return this.chatsService.createOrGetChat([req.user.userId, body.participantId]);
    }

    @Get('chats/:id/messages')
    async getChatMessages(@Param('id') id: string) {
        return this.chatsService.getMessages(id);
    }

    @Post('chats/:id/messages')
    async sendChatMessage(@Param('id') id: string, @Body() body: { content: string }, @Request() req) {
        return this.chatsService.sendMessage(id, req.user.userId, body.content);
    }

    // ─── Tickets ──────────────────────────────────────────────────────────────

    @Post('tickets')
    async createTicket(@Body() dto: any, @Request() req) {
        return this.supportService.createTicket(dto, req.user.userId);
    }

    @Get('tickets')
    async getTickets(@Query() query: any) {
        return this.supportService.findAllTickets(query);
    }

    @Get('tickets/:id')
    async getTicket(@Param('id') id: string) {
        return this.supportService.findTicketById(id);
    }

    @Put('tickets/:id')
    async updateTicket(@Param('id') id: string, @Body() dto: any) {
        return this.supportService.updateTicket(id, dto);
    }

    @Put('tickets/:id/escalate')
    async escalateTicket(@Param('id') id: string) {
        return this.supportService.escalateTicket(id);
    }

    // ─── Departments ──────────────────────────────────────────────────────────

    @Get('departments')
    async getDepartments() {
        return this.supportService.getDepartments();
    }

    // ─── Announcements ────────────────────────────────────────────────────────

    @Get('announcements')
    async getAnnouncements() {
        return this.supportService.findAllAnnouncements();
    }

    @Post('announcements')
    async createAnnouncement(@Body() dto: any, @Request() req) {
        return this.supportService.createAnnouncement(dto, req.user.userId);
    }

    @Put('announcements/:id/archive')
    async archiveAnnouncement(@Param('id') id: string) {
        return this.supportService.archiveAnnouncement(id);
    }

    // ─── Escalations ──────────────────────────────────────────────────────────

    @Get('escalations')
    async getEscalations() {
        return this.supportService.getEscalations();
    }
}
