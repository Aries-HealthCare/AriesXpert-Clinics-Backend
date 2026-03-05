import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payroll, PayrollDocument } from './schemas/payroll.schema';

@Injectable()
export class PayrollService {
    constructor(
        @InjectModel(Payroll.name) private payrollModel: Model<PayrollDocument>
    ) { }

    async create(data: Partial<Payroll>): Promise<PayrollDocument> {
        const existing = await this.payrollModel.findOne({
            clinicId: data.clinicId,
            staffId: data.staffId,
            month: data.month
        });

        if (existing) {
            Object.assign(existing, data);
            return existing.save();
        }

        const newPayroll = new this.payrollModel(data);
        return newPayroll.save();
    }

    async findByClinic(clinicId: string, month?: string): Promise<PayrollDocument[]> {
        const filter: any = { clinicId };
        if (month) {
            filter.month = month;
        }

        return this.payrollModel.find(filter)
            .populate('staffId', 'firstName lastName role email salaryConfig')
            .exec();
    }

    async updateStatus(id: string, status: string): Promise<PayrollDocument> {
        const payroll = await this.payrollModel.findByIdAndUpdate(
            id,
            { status, paymentDate: status === 'paid' ? new Date() : undefined },
            { new: true }
        );
        if (!payroll) throw new NotFoundException('Payroll not found');
        return payroll;
    }
}
