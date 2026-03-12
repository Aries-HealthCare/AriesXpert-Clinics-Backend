import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { VisitsService } from "./visits.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller(["visits", "appointments", "appointments/visits"])
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) { }

  @Get("stats")
  getStats() {
    return this.visitsService.getStats();
  }

  @Post()
  create(@Body() createVisitDto: any) {
    return this.visitsService.create(createVisitDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role?.toLowerCase();
    let userClinicId = null;

    const clinicRoles = [
      "clinic_owner", "clinic_admin", "receptionist",
      "therapist", "physiotherapist", "physio", "accounts_manager",
    ];

    if (clinicRoles.includes(userRole)) {
      userClinicId = req.user.clinicId;
      if (!userClinicId) {
        return { success: false, message: "Clinic ID not found in user profile." };
      }
    }

    return this.visitsService.findAll(query, userClinicId);
  }

  // PART 2: Strict separation for Admin vs Clinic Home Visits
  @Get("admin/home-sessions")
  @UseGuards(JwtAuthGuard)
  async findAdminHomeSessions(@Query() query: any) {
    return this.visitsService.findAll({ ...query, consultation_type: "home" });
  }

  @Get("clinic/home-sessions")
  @UseGuards(JwtAuthGuard)
  async findClinicHomeSessions(@Request() req: any, @Query() query: any) {
    const userClinicId = req.user.clinicId;
    if (!userClinicId) {
      return { success: false, message: "Clinic ID not found in user profile." };
    }
    return this.visitsService.findAll({ ...query, consultation_type: "home" }, userClinicId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.visitsService.findOne(id);
  }

  @Put(":id")
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateVisitDto: any) {
    return this.visitsService.update(id, updateVisitDto);
  }

  @Put(":id/status")
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() { status }: { status: string },
  ) {
    return this.visitsService.updateStatus(id, status);
  }

  @Put(":id/payment")
  updatePayment(@Param("id") id: string, @Body() paymentDto: any) {
    return this.visitsService.updatePaymentStatus(id, paymentDto);
  }

  // ============================================================
  // TREATMENT MODULE ROUTES
  // ============================================================

  /**
   * STEP 4 — Mark patient as Arrived
   * Receptionist clicks "Mark Arrived" in Appointment/Treatment Module
   * Status: Scheduled → Arrived
   */
  @Post(":id/arrive")
  @UseGuards(JwtAuthGuard)
  async markArrived(@Param("id") id: string) {
    try {
      const visit = await this.visitsService.markArrived(id);
      return { success: true, data: visit, message: "Patient marked as Arrived" };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  /**
   * STEP 5 — Therapist starts treatment
   * Therapist clicks "Start Treatment" on Arrived patient
   * Status: Arrived → Treatment Started
   */
  @Post(":id/start-treatment")
  @UseGuards(JwtAuthGuard)
  async startTreatment(@Param("id") id: string) {
    try {
      const visit = await this.visitsService.startTreatment(id);
      return { success: true, data: visit, message: "Treatment Started" };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  /**
   * STEP 6 & 7 — Therapist submits treatment form (Assessment or Follow-up)
   * Triggers:
   *   - Appointment Status → Completed
   *   - Treatment completedSessions +1
   *   - Emits treatment.form_submitted event
   * Status: Treatment Started → Completed
   */
  @Post(":id/submit-form")
  @UseGuards(JwtAuthGuard)
  async submitTreatmentForm(
    @Param("id") id: string,
    @Body() body: { formType: "Assessment" | "Follow-up"; formData: any },
  ) {
    if (!body.formType || !body.formData) {
      throw new BadRequestException("formType and formData are required");
    }
    try {
      const result = await this.visitsService.submitTreatmentForm(
        id,
        body.formType,
        body.formData,
      );
      return { success: true, data: result, message: `${body.formType} submitted successfully` };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  // Keep old start route for backward compatibility (points to legacy startVisit)
  @Post(":id/start")
  @UseGuards(JwtAuthGuard)
  start(@Param("id") id: string) {
    return this.visitsService.startVisit(id);
  }

  @Post(":id/complete")
  @Put(":id/complete")
  @UseGuards(JwtAuthGuard)
  complete(
    @Param("id") id: string,
    @Body() body: { therapistId: string; paymentMethod?: "CASH" | "ONLINE" },
  ) {
    return this.visitsService.completeVisit(
      id,
      body.therapistId,
      body.paymentMethod,
    );
  }

  // ==== ASSESSMENT ENDPOINTS ====

  @Get("assessment/clinic/:clinicId")
  @UseGuards(JwtAuthGuard)
  getAssessmentsByClinic(@Param("clinicId") clinicId: string) {
    return this.visitsService.getAssessmentsByClinic(clinicId);
  }

  @Post(":id/validate-arrival")
  @UseGuards(JwtAuthGuard)
  async validateArrival(@Param("id") id: string, @Body() body: any) {
    return this.visitsService.validateArrival(id, body.location);
  }

  @Get("forms/:id")
  async getFormConfig(@Param("id") id: string) {
    return this.visitsService.getFormConfig(id);
  }
}
