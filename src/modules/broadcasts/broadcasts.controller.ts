import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { BroadcastsService } from "./index";
import { JwtAuthGuard } from "../../common/guards";

@Controller("broadcasts")
@UseGuards(JwtAuthGuard)
export class BroadcastsController {
  constructor(private broadcastsService: BroadcastsService) { }

  @Get()
  async getBroadcasts(
    @Request() req: any,
    @Query("therapistId") therapistId?: string,
    @Query("location") location?: string,
    @Query("radius") radius?: number,
    @Query("city") city?: string,
    @Query("status") status?: string,
    @Query("clinicId") clinicId?: string,
    @Query("limit") limit?: number,
    @Query("page") page?: number,
  ) {
    try {
      // If radius is provided, it's likely the mobile app looking for nearby broadcasts
      if (radius || (location && !city)) {
        const broadcasts = await this.broadcastsService.findBroadcasts({
          therapistId,
          location,
          radius,
        });
        return {
          success: true,
          data: broadcasts,
        };
      }

      // Otherwise, assume Admin Dashboard listing or general fetch
      const skip = page ? (page - 1) * (limit || 10) : 0;

      const userRole = req.user.role;
      let userClinicId = clinicId;

      if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
        userClinicId = req.user.clinicId;
      }

      const result = await this.broadcastsService.getAllBroadcasts({
        city: city || location, // Support both
        status,
        therapistId,
        clinicId: userClinicId,
        limit: limit || 50,
        skip,
      });

      return {
        success: true,
        data: result.data,
        total: result.total,
        page: page || 1,
        limit: result.limit,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("stats")
  async getStats() {
    return this.broadcastsService.getStats();
  }

  @Get(":id")
  async getBroadcast(@Param("id") id: string) {
    try {
      const broadcast = await this.broadcastsService.getBroadcastById(id);
      return {
        success: true,
        data: broadcast,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(":broadcastId/interested-list")
  async getInterestedTherapists(@Param("broadcastId") broadcastId: string) {
    try {
      const therapists =
        await this.broadcastsService.getInterestedTherapists(broadcastId);

      return {
        success: true,
        interestedCount: therapists.length,
        therapists,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post(":broadcastId/interested")
  async markTherapistInterested(
    @Param("broadcastId") broadcastId: string,
    @Body() dto: { therapistId: string },
  ) {
    try {
      const result = await this.broadcastsService.markTherapistInterested(
        broadcastId,
        dto.therapistId,
      );

      return {
        success: true,
        message: result.assigned
          ? "Interest registered. You are assigned!"
          : "Interest registered. Waiting for assignment.",
        interested: result.interestedCount,
        assigned: result.assigned,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // --- NEW THERAPIST LEAD SYSTEM ENDPOINTS ---

  @Get("my-leads")
  async getMyLeads(@Request() req: any, @Query("status") status?: string) {
    try {
      // Find therapist profile for the authenticated user
      const therapist = req.user.role === 'therapist'
        ? await this.broadcastsService.getTherapistByUserId(req.user.id)
        : null;

      const therapistId = therapist ? (therapist as any)._id : req.query.therapistId;

      if (!therapistId) throw new BadRequestException("Therapist profile not found");

      const leads = await this.broadcastsService.getMyLeads(therapistId.toString(), status);
      return { success: true, data: leads };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(":id/accept")
  async acceptLead(@Param("id") id: string, @Request() req: any) {
    try {
      const therapist = req.user.role === 'therapist'
        ? await this.broadcastsService.getTherapistByUserId(req.user.id)
        : null;

      const therapistId = therapist ? (therapist as any)._id : req.body.therapistId;

      if (!therapistId) throw new BadRequestException("Therapist profile not found");

      return await this.broadcastsService.acceptLead(id, therapistId.toString());
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(":id/reject")
  async rejectLead(@Param("id") id: string, @Request() req: any) {
    try {
      const therapist = req.user.role === 'therapist'
        ? await this.broadcastsService.getTherapistByUserId(req.user.id)
        : null;

      const therapistId = therapist ? (therapist as any)._id : req.body.therapistId;

      if (!therapistId) throw new BadRequestException("Therapist profile not found");

      return await this.broadcastsService.rejectLead(id, therapistId.toString());
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(":id/view")
  async markViewed(@Param("id") id: string, @Request() req: any) {
    try {
      const therapist = req.user.role === 'therapist'
        ? await this.broadcastsService.getTherapistByUserId(req.user.id)
        : null;

      const therapistId = therapist ? (therapist as any)._id : req.body.therapistId;

      if (!therapistId) return { success: false };

      await this.broadcastsService.markLeadViewed(id, therapistId.toString());
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // --- END OF NEW LEAD SYSTEM ---

  @Post()
  async createBroadcast(@Body() body: any) {
    try {
      const broadcast = await this.broadcastsService.createBroadcast(body);
      return {
        success: true,
        message: "Broadcast created successfully",
        data: broadcast,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post(":broadcastId/not-interested")
  async markTherapistNotInterested(
    @Param("broadcastId") broadcastId: string,
    @Body() dto: { therapistId: string },
  ) {
    try {
      await this.broadcastsService.markTherapistNotInterested(
        broadcastId,
        dto.therapistId,
      );

      return {
        success: true,
        message: "Marked as not interested",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
