import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post()
    async markAttendance(@Body() body: any) {
        return this.attendanceService.createOrUpdate(body);
    }

    @Get('clinic/:clinicId')
    async getByClinic(
        @Request() req: any,
        @Param('clinicId') clinicId: string,
        @Query('month') month?: string
    ) {
        const userRole = req.user.role;
        let userClinicId = clinicId;

        if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
            userClinicId = req.user.clinicId;
        }

        return this.attendanceService.findByClinic(userClinicId, month);
    }
}
