import { Controller, Post, Body } from "@nestjs/common";
import { ClinicsService } from "./clinics.service";

@Controller("public/clinics")
export class PublicClinicsController {
    constructor(private readonly clinicsService: ClinicsService) { }

    @Post("register")
    async register(@Body() body: any) {
        const clinic = await this.clinicsService.registerClinic(body);
        return {
            success: true,
            message: "Clinic registration submitted successfully and is pending approval.",
            clinicId: (clinic as any)._id,
        };
    }
}
