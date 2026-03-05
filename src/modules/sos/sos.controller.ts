import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query, Logger, ForbiddenException
} from '@nestjs/common';
import { SosService } from './sos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('sos')
@UseGuards(JwtAuthGuard)
export class SosController {
  private readonly logger = new Logger(SosController.name);

  constructor(private readonly sosService: SosService) { }

  /**
   * POST /sos/start
   * Mobile app triggers emergency alert
   */
  @Post('start')
  async startSos(
    @Request() req: any,
    @Body() body: { location: { latitude: number; longitude: number; accuracy?: number }; timestamp?: string },
  ) {
    try {
      const userId = req.user.id;
      // In this setup, the therapist profile may be linked to the user account
      const therapistId = req.user.therapistProfileId || req.user.id;
      const therapistName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Therapist';
      const phone = req.user.phone || '';

      const result = await this.sosService.startSos(userId, therapistId, therapistName, phone, body.location);
      return { success: true, ...result };
    } catch (error) {
      this.logger.error(`SOS start failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * PATCH /sos/:sessionId/location
   * Mobile app streams live location (5s interval)
   */
  @Patch(':sessionId/location')
  async updateLocation(
    @Param('sessionId') sessionId: string,
    @Body() body: { lat: number; lng: number; accuracy?: number; batteryLevel?: number; networkStrength?: string },
  ) {
    try {
      const result = await this.sosService.updateLocation(sessionId, body);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * POST /sos/:sessionId/generate-pin
   * ADMIN ONLY: Generate a secure 6-digit resolution PIN
   */
  @Post(':sessionId/generate-pin')
  async generatePin(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    // Basic verification: user must be an admin
    if (req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Nexus Access Denied: Command protocol restricted to rescue admins only.');
    }

    try {
      const result = await this.sosService.generateResolutionPin(sessionId, req.user.id);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * POST /sos/:sessionId/resolve
   * Mobile app: Therapist enters the secure PIN to close the session
   */
  @Post(':sessionId/resolve')
  async resolveSos(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { pin: string },
  ) {
    try {
      const therapistId = req.user.therapistProfileId || req.user.id;
      const result = await this.sosService.resolveSos(sessionId, body.pin, therapistId);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * GET /sos
   * Admin dashboard: list all active alerts
   */
  @Get()
  async listSos(@Query('status') status?: string) {
    try {
      const alerts = await this.sosService.listActive();
      return { success: true, alerts };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * GET /sos/:sessionId/full
   * Admin dashboard: get comprehensive session data (Geo-trail, logs)
   */
  @Get(':sessionId/full')
  async getFullSosData(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    if (req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access Restricted');
    }

    try {
      const data = await this.sosService.getFullSessionData(sessionId);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
