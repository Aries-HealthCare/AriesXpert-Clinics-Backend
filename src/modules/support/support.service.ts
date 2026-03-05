import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportTicket, SupportTicketDocument } from './schemas/support-ticket.schema';
import { Announcement, AnnouncementDocument } from './schemas/announcement.schema';

@Injectable()
export class SupportService {
    constructor(
        @InjectModel(SupportTicket.name) private ticketModel: Model<SupportTicketDocument>,
        @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
    ) { }

    // ─── Tickets ──────────────────────────────────────────────────────────────

    async createTicket(dto: any, userId: string) {
        return this.ticketModel.create({ ...dto, raisedBy: userId });
    }

    async findAllTickets(query: any = {}) {
        const { status, priority, department, page = 1, limit = 20 } = query;
        const filter: any = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (department) filter.department = department;

        const tickets = await this.ticketModel
            .find(filter)
            .populate('raisedBy', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await this.ticketModel.countDocuments(filter);
        return { tickets, total, page: Number(page) };
    }

    async findTicketById(id: string) {
        const ticket = await this.ticketModel.findById(id)
            .populate('raisedBy', 'name email')
            .populate('assignedTo', 'name email')
            .exec();
        if (!ticket) throw new NotFoundException(`Ticket #${id} not found`);
        return ticket;
    }

    async updateTicket(id: string, dto: any) {
        const ticket = await this.ticketModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!ticket) throw new NotFoundException(`Ticket #${id} not found`);
        return ticket;
    }

    async escalateTicket(id: string) {
        return this.updateTicket(id, { status: 'Escalated', isEscalated: true });
    }

    async getEscalations() {
        return this.ticketModel.find({ isEscalated: true, status: 'Escalated' })
            .populate('raisedBy', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getDepartments() {
        const depts = await this.ticketModel.distinct('department');
        return depts.filter(Boolean).map((name: string) => ({ name, openTickets: 0, members: 0 }));
    }

    // ─── Announcements ────────────────────────────────────────────────────────

    async createAnnouncement(dto: any, userId: string) {
        return this.announcementModel.create({ ...dto, createdBy: userId });
    }

    async findAllAnnouncements() {
        return this.announcementModel.find({ status: 'Active' })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .exec();
    }

    async archiveAnnouncement(id: string) {
        return this.announcementModel.findByIdAndUpdate(id, { status: 'Archived' }, { new: true }).exec();
    }
}
