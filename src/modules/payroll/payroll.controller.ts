import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../common/guards';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    @Post()
    async generatePayslip(@Body() body: any) {
        return this.payrollService.create(body);
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

        return this.payrollService.findByClinic(userClinicId, month);
    }

    @Put(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: string
    ) {
        return this.payrollService.updateStatus(id, status);
    }
}
