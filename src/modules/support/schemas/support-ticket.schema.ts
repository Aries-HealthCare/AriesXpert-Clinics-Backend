import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupportTicketDocument = SupportTicket & Document;

@Schema({ timestamps: true })
export class SupportTicket {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({
        enum: ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed', 'Escalated'],
        default: 'Open',
    })
    status: string;

    @Prop({ enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' })
    priority: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    raisedBy: Types.ObjectId;

    @Prop()
    raisedByName: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    assignedTo: Types.ObjectId;

    @Prop()
    assignedToName: string;

    @Prop()
    department: string;

    @Prop()
    clinicName: string;

    @Prop()
    ticketId: string;

    @Prop([String])
    attachments: string[];

    @Prop({ default: false })
    isEscalated: boolean;

    @Prop({ type: Object })
    metadata: Record<string, any>;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

// Auto-generate ticket ID
SupportTicketSchema.pre('save', async function (next) {
    if (!this.ticketId) {
        const count = await (this.constructor as any).countDocuments();
        this.ticketId = `TICK-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});
