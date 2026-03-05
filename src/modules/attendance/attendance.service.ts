import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>
    ) { }

    async createOrUpdate(data: Partial<Attendance>): Promise<AttendanceDocument> {
        const { clinicId, staffId, date } = data;
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const existing = await this.attendanceModel.findOne({
            clinicId,
            staffId,
            date: { $gte: startOfDay, $lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) }
        });

        if (existing) {
            Object.assign(existing, data);
            return existing.save();
        }

        const newAttendance = new this.attendanceModel({
            ...data,
            date: startOfDay
        });
        return newAttendance.save();
    }

    async findByClinic(clinicId: string, month?: string): Promise<AttendanceDocument[]> {
        const filter: any = { clinicId };

        if (month) {
            const [year, m] = month.split('-');
            const startDate = new Date(Number(year), Number(m) - 1, 1);
            const endDate = new Date(Number(year), Number(m), 0, 23, 59, 59);
            filter.date = { $gte: startDate, $lte: endDate };
        }

        return this.attendanceModel.find(filter).populate('staffId', 'firstName lastName role email').exec();
    }
}
