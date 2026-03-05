import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
} from "@nestjs/common";
import { ClinicsService } from "./clinics.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("founder/clinics")
@UseGuards(AuthGuard("jwt"))
export class FounderClinicsController {
    constructor(private readonly clinicsService: ClinicsService) { }

    @Get()
    async findAll() {
        // Fetch only from clinics collection with aggregate stats
        const clinics = await this.clinicsService.findAll();
        return { clinics };
    }

    @Post()
    create(@Body() body: any) {
        return this.clinicsService.create(body);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() body: any) {
        return this.clinicsService.update(id, body);
    }

    @Get("analytics")
    async getAnalytics() {
        const clinics = await this.clinicsService.findAll();
        let totalClinics = clinics.length;
        let activeClinics = clinics.filter(c => c.status === 'active').length;
        let pendingClinics = clinics.filter(c => c.status === 'pending_approval').length;
        let totalFranchise = clinics.filter(c => c.type === 'OWN_BRAND' || c.type === 'CO_BRANDED').length;
        let companyOwned = clinics.filter(c => c.type === 'COMPANY_OWNED').length;

        let totalRevenue = clinics.reduce((acc, c) => acc + (c.revenue || 0), 0);
        let totalPatients = clinics.reduce((acc, c) => acc + (c.patientsCount || 0), 0);

        // Calculate mock royalties for now
        let totalRoyaltyCollected = totalRevenue * 0.1;

        return {
            totalClinics,
            activeClinics,
            pendingClinics,
            totalFranchise,
            companyOwned,
            totalRevenue,
            totalPatients,
            totalRoyaltyCollected,
        };
    }

    @Get("revenue")
    async getRevenue() {
        const clinics = await this.clinicsService.findAll();
        const revenueByClinic = clinics.map(c => ({
            id: c.id,
            name: c.name,
            revenue: c.revenue || 0,
            type: c.type
        }));
        return { revenue: revenueByClinic };
    }

    @Get("compliance")
    async getCompliance() {
        const clinics = await this.clinicsService.findAll();
        const complianceData = clinics.map(c => ({
            id: c.id,
            name: c.name,
            score: c.complianceScore || 0,
            status: c.status
        }));
        return { compliance: complianceData };
    }
}
