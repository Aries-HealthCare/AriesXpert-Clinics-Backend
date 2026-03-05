import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Request,
} from "@nestjs/common";
import { TherapistsService } from "./therapists.service";
import { AuthGuard } from "@nestjs/passport";
import { AnyFilesInterceptor } from "@nestjs/platform-express";

@Controller("therapists")
@UseGuards(AuthGuard("jwt"))
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) { }

  @Post()
  create(@Body() createTherapistDto: any) {
    return this.therapistsService.create(createTherapistDto);
  }

  @Post("onboard")
  @UseInterceptors(AnyFilesInterceptor())
  async onboard(@Body() body: any, @UploadedFiles() files: Array<any>, @Request() req: any) {
    try {
      let {
        personalDetails,
        professionalDetails,
        bankingDetails,
        serviceArea,
      } = body;

      // Parse JSON strings if necessary
      try {
        if (typeof personalDetails === "string")
          personalDetails = JSON.parse(personalDetails);
        if (typeof professionalDetails === "string")
          professionalDetails = JSON.parse(professionalDetails);
        if (typeof bankingDetails === "string")
          bankingDetails = JSON.parse(bankingDetails);
        if (typeof serviceArea === "string")
          serviceArea = JSON.parse(serviceArea);
      } catch (e) {
        throw new BadRequestException("Invalid JSON format in form data");
      }

      // C3-FIX: Extract authenticated user ID from JWT so submission is
      // always attributed to the real verified user, not the submitted email.
      const authenticatedUserId = req?.user?._id?.toString() || req?.user?.id?.toString();

      return this.therapistsService.onboard({
        personalDetails,
        professionalDetails,
        bankingDetails,
        serviceArea,
        files,
      }, authenticatedUserId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * H1-FIX: Real implementation replacing the hardcoded TODO stub.
   * Returns the therapist's live onboarding status, submission count,
   * rejection reason, and field-level completeness from the database.
   */
  @Get("onboarding/status")
  @UseGuards(AuthGuard("jwt"))
  async getOnboardingStatus(@Request() req: any) {
    const userId = req?.user?._id?.toString() || req?.user?.id?.toString();
    const therapist = await this.therapistsService.findByUserId(userId);
    if (!therapist) {
      return { status: "INCOMPLETE", profileStatus: "INCOMPLETE", step: null, reason: null, submissionCount: 0 };
    }
    const t: any = therapist;

    // Safety: If not submitted, force INCOMPLETE even if defaults were wrong
    const hasBeenSubmitted = t.submittedAt != null || (t.submissionCount && t.submissionCount > 0);
    const effectiveOnboardingStatus = hasBeenSubmitted ? (t.onboardingStatus || "UNDER_REVIEW") : (t.onboardingStatus || "INCOMPLETE");
    const effectiveProfileStatus = hasBeenSubmitted ? (t.status || "UNDER_REVIEW") : (t.status || "INCOMPLETE");

    return {
      status: effectiveOnboardingStatus.toUpperCase(),
      profileStatus: effectiveProfileStatus.toUpperCase(),
      step: t.onboardingStep ?? null,
      reason: t.statusReason ?? t.rejectionReason ?? null,
      rejectionReasons: Array.isArray(t.rejectionReasons)
        ? t.rejectionReasons
        : t.statusReason
          ? [{ section: "General", field: "Profile", reason: t.statusReason }]
          : [],
      submissionCount: t.submissionCount ?? 0,
      isActive: t.isActive ?? false,
      submittedAt: t.submittedAt ?? null,
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("by-user/:userId")
  findByUserId(@Param("userId") userId: string) {
    return this.therapistsService.findByUserId(userId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("by-phone/:phone")
  findByPhone(@Param("phone") phone: string) {
    return this.therapistsService.findByPhone(phone);
  }

  @Get("search")
  findInCity(@Request() req: any, @Query("city") city: string) {
    const userRole = req.user.role;

    // Clinic roles
    const isClinicUser = ["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole);

    let userClinicId = null;
    if (isClinicUser) {
      userClinicId = req.user.clinicId;
    } else {
      // Core Admin should search in Core network by default (clinicId: null)
      userClinicId = "null";
    }

    return this.therapistsService.findInCity(city, userClinicId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.therapistsService.getTherapistById(id);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role;
    const isClinicUser = ["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole);

    if (isClinicUser) {
      query.clinicId = req.user.clinicId;
    } else if (!query.clinicId) {
      // For ANY role not tied to a clinic (Founder, Admin, Manager, etc.), 
      // default to the core AriesXpert network (clinicId: null)
      query.clinicId = "null";
    }

    return this.therapistsService.findAll(query);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: any) {
    return this.therapistsService.update(id, dto);
  }

  @Put(":id/status")
  updateStatus(@Param("id") id: string, @Body() body: any) {
    const { status, rejectionReason } = body;
    // Map Frontend standard status to Backend onboardingStatus
    return this.therapistsService.update(id, {
      onboardingStatus: status,
      rejectionReason
    });
  }

  @Put(":id/bank-status")
  updateBankStatus(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    const { status, reason } = body;
    return this.therapistsService.updateBankStatus(id, status, reason, req.user._id || req.user.id);
  }

  @Put(":id/profile-status")
  updateProfileStatus(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    // Safely resolve admin ID from JWT payload (accounts for both _id and id key shapes)
    const adminId =
      req?.user?._id?.toString() ||
      req?.user?.id?.toString() ||
      req?.user?.sub?.toString() ||
      "system";
    return this.therapistsService.updateProfileStatus(id, body, adminId);
  }

  @Post(":id/reject-expert")
  @UseGuards(AuthGuard("jwt"))
  rejectExpert(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    const adminId = req?.user?._id?.toString() || req?.user?.id?.toString();
    return this.therapistsService.rejectExpert(id, body, adminId);
  }

  @Post(":id/financial-adjustment")
  addFinancialAdjustment(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.therapistsService.addFinancialAdjustment(id, body, req.user._id || req.user.id);
  }

  @Post(":id/alert")
  sendAlert(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.therapistsService.sendTherapistAlert(id, body, req.user._id || req.user.id);
  }

  @Get(":id/stats")
  getStats(@Param("id") id: string) {
    return this.therapistsService.getTherapistStats(id);
  }

  @Get(":id/fraud-logs")
  getFraudLogs(@Param("id") id: string) {
    return this.therapistsService.getFraudLogs(id);
  }

  @Get(":id/audit-logs")
  getAuditLogs(@Param("id") id: string) {
    return this.therapistsService.getAuditLogs(id);
  }

  @Post("live-location")
  updateLiveLocation(@Request() req: any, @Body() body: { latitude: number; longitude: number }) {
    return this.therapistsService.updateLiveLocation(req.user.id, body.latitude, body.longitude);
  }
}
