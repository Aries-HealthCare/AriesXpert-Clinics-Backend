import { Controller, Get, Post, Body, UseGuards, Request, HttpException, HttpStatus, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';

@Controller('settings/email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
    constructor(private readonly emailService: EmailService) { }

    @Get()
    @Roles('super_admin', 'founder')
    async getSettings() {
        const settings = await this.emailService.getSettings();
        return settings || {};
    }

    @Post()
    @Roles('super_admin', 'founder')
    async updateSettings(@Body() dto: UpdateEmailSettingsDto, @Request() req) {
        return this.emailService.updateSettings(dto, req.user?.email || 'admin');
    }

    @Post('test')
    @Roles('super_admin', 'founder')
    async testConnection(@Request() req) {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
            throw new HttpException('No user email found in token for testing.', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.emailService.testConnection(adminEmail);
            return { success: true, message: 'Test email dispatched successfully.' };
        } catch (e) {
            throw new HttpException(e.message || 'SMTP Connection Failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('logs')
    @Roles('super_admin', 'founder')
    async getLogs(@Query('page') page = 1, @Query('limit') limit = 50) {
        return this.emailService.getLogs(Number(page), Number(limit));
    }

    @Post('send')
    @Roles('super_admin', 'founder')
    async sendManual(@Body() body: { to: string; subject: string; body: string }) {
        if (!body.to || !body.subject || !body.body) {
            throw new HttpException('Recipient, subject, and body are required.', HttpStatus.BAD_REQUEST);
        }
        const success = await this.emailService.sendManualMail(body.to, body.subject, body.body);
        if (!success) {
            throw new HttpException('Failed to send mail. Check SMTP logs.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { success: true, message: 'Email sent successfully.' };
    }
}
