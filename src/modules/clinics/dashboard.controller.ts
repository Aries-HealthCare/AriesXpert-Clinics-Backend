import { Controller, Get, UseGuards, Request, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DashboardService } from "./dashboard.service";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get("admin/global-kpi")
    async getGlobalKpi() {
        return this.dashboardService.getAdminGlobalKpi();
    }

    @Get("admin/clinic-list")
    async getAdminClinicList() {
        return this.dashboardService.getAdminClinicList();
    }

    @Get("clinic/dashboard-kpi")
    async getClinicDashboardKpi(@Request() req: any, @Query('clinicId') queryClinicId: string) {
        const clinicId = queryClinicId || req.user.clinicId;
        return this.dashboardService.getClinicDashboardKpi(clinicId);
    }

    @Get("clinic/revenue-trend")
    async getClinicRevenueTrend(@Request() req: any, @Query('clinicId') queryClinicId: string) {
        const clinicId = queryClinicId || req.user.clinicId;
        return this.dashboardService.getClinicRevenueTrend(clinicId);
    }

    @Get("clinic/patient-growth")
    async getClinicPatientGrowth(@Request() req: any, @Query('clinicId') queryClinicId: string) {
        const clinicId = queryClinicId || req.user.clinicId;
        return this.dashboardService.getClinicPatientGrowth(clinicId);
    }

    @Get("clinic/profile")
    async getClinicProfile(@Request() req: any, @Query('clinicId') queryClinicId: string) {
        const clinicId = queryClinicId || req.user.clinicId;
        return this.dashboardService.getClinicProfile(clinicId);
    }
}
