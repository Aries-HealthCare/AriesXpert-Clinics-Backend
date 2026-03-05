import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
@UseGuards(AuthGuard('jwt'))
export class AssessmentsController {
    constructor(private readonly assessmentsService: AssessmentsService) { }

    @Post('initial')
    async createInitial(@Body() dto: any, @Request() req: any) {
        return this.assessmentsService.createInitial(dto, req.user.clinicId, req.user.id);
    }

    @Post('follow-up')
    async createFollowUp(@Body() dto: any, @Request() req: any) {
        return this.assessmentsService.createFollowUp(dto, req.user.clinicId, req.user.id);
    }

    @Get('patient/:patientId')
    async findByPatient(@Param('patientId') patientId: string, @Request() req: any) {
        return this.assessmentsService.findByPatient(patientId, req.user.clinicId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.assessmentsService.findInitialById(id, req.user.clinicId);
    }
}
