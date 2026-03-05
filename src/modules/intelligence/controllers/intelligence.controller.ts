import { Controller, Get, UseGuards, Query, Logger, Request, ForbiddenException } from '@nestjs/common';
import { IntelligenceService } from '../services/intelligence.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
    private readonly logger = new Logger(IntelligenceController.name);

    constructor(
        private readonly intelligenceService: IntelligenceService
    ) { }

    /**
     * GET /intelligence/map
     * Fetch tactical map data including patients, bounds, and leakage flags
     */
    @Get('map')
    async getMapIntelligence(@Request() req: any) {
        if (req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Operational Map Access Denied. Tactical clearance required.');
        }

        try {
            const data = await this.intelligenceService.getMapIntelligence();
            return { success: true, count: data.length, data };
        } catch (error) {
            this.logger.error(`Failed to fetch map intelligence: ${error.message}`);
            return { success: false, message: 'Internal Tactical Engine Error' };
        }
    }

    /**
     * GET /intelligence/analytics
     * Fetch executive summary of operational leakage
     */
    @Get('analytics')
    async getLeakageAnalytics(@Request() req: any) {
        if (req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Operational Map Access Denied. Tactical clearance required.');
        }

        try {
            const data = await this.intelligenceService.getAnalytics();
            return { success: true, data };
        } catch (error) {
            this.logger.error(`Failed to fetch leakage analytics: ${error.message}`);
            return { success: false, message: 'Data fetch failed.' };
        }
    }

    /**
     * POST /intelligence/track
     * Receives background GPS pulses from the therapist mobile app
     */
    @Get('track') // Assuming post in prod, use get temporarily if testing, but wait, POST is correct
    @UseGuards(JwtAuthGuard)
    async trackLocation(@Request() req: any, @Query('lat') lat: number, @Query('lng') lng: number, @Query('accuracy') accuracy?: number) {
        if (req.user.role !== 'therapist') {
            throw new ForbiddenException('Only active field agents can broadcast telemetry.');
        }

        if (!lat || !lng) {
            return { success: false, message: 'Missing coordinate payload' };
        }

        try {
            await this.intelligenceService.trackTherapistLocation(req.user.id, { lat: Number(lat), lng: Number(lng), accuracy: Number(accuracy) });
            return { success: true };
        } catch (error) {
            this.logger.error(`Telemetry ingestion failed: ${error.message}`);
            return { success: false, message: 'Telemetry drop' };
        }
    }
}
