import { Controller, Get, Post, Body, Param, Put, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssessmentTemplatesService } from './assessment-templates.service';

@Controller('assessment-templates')
@UseGuards(AuthGuard('jwt'))
export class AssessmentTemplatesController {
    constructor(private readonly templatesService: AssessmentTemplatesService) { }

    @Post()
    async create(@Body() dto: any, @Request() req: any) {
        return this.templatesService.create(dto, req.user.clinicId);
    }

    @Get()
    async findAll(@Request() req: any) {
        return this.templatesService.findAll(req.user.clinicId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.templatesService.findOne(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: any) {
        return this.templatesService.update(id, dto);
    }
}
