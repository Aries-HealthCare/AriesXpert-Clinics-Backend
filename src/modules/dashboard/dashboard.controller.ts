import { Controller, Get, UseGuards, Request, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get("stats")
  async getStats(@Request() req: any) {
    try {
      const therapistId = req.user.id;
      const stats =
        await this.dashboardService.getTherapistDashboard(therapistId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("admin")
  async getAdminDashboard(@Request() req: any, @Query() query: any) {
    try {
      const stats = await this.dashboardService.getAdminDashboard(
        req.user,
        query,
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("leads/conversion")
  async getLeadConversion(@Query("days") days: string = "30") {
    try {
      const stats = await this.dashboardService.getLeadConversionStats(
        parseInt(days),
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
