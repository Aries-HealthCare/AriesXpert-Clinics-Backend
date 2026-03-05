import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { TreatmentsService } from "./treatments.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("treatments")
@UseGuards(AuthGuard("jwt"))
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) { }

  @Post("createTreatment")
  async createTreatment(@Request() req: any, @Body() createTreatmentDto: any) {
    // If clinic portal user, inject clinicId
    if (req.user.clinicId) {
      createTreatmentDto.clinicId = req.user.clinicId;
    }
    return await this.treatmentsService.createTreatment(createTreatmentDto);
  }

  @Get()
  async getAllTreatments(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role;
    let userClinicId = query.clinicId;

    if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
      userClinicId = req.user.clinicId;
    }

    return this.treatmentsService.getAllTreatments({
      limit: query.limit ? parseInt(query.limit) : undefined,
      skip: query.skip ? parseInt(query.skip) : undefined,
      status: query.status,
      patientId: query.patientId,
      therapistId: query.therapistId,
      clinicId: userClinicId,
    });
  }

  @Get("stats")
  async getStats() {
    return this.treatmentsService.getStats();
  }

  @Get("getTreatmentById/:id")
  async getTreatmentById(@Param("id") id: string) {
    return await this.treatmentsService.getTreatmentById(id);
  }

  @Get("getTreatmentsByPatientId/:patientId")
  async getTreatmentsByPatientId(@Param("patientId") patientId: string) {
    return await this.treatmentsService.getTreatmentsByPatientId(patientId);
  }

  @Get("getTreatmentsByTherapistId/:therapistId")
  async getTreatmentsByTherapistId(@Param("therapistId") therapistId: string) {
    return await this.treatmentsService.getTreatmentsByTherapistId(therapistId);
  }

  @Put("updateTreatment/:id")
  async updateTreatment(
    @Param("id") id: string,
    @Body() updateTreatmentDto: any,
  ) {
    return await this.treatmentsService.updateTreatment(id, updateTreatmentDto);
  }

  @Delete("deleteTreatment/:id")
  async deleteTreatment(@Param("id") id: string) {
    return await this.treatmentsService.deleteTreatment(id);
  }

  @Get("getRevenueData")
  async getRevenueData(
    @Query("therapistId") therapistId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return await this.treatmentsService.getRevenueStats({
      therapistId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Put("markPaymentReceived/:id")
  async markPaymentReceived(@Param("id") id: string) {
    return await this.treatmentsService.markPaymentReceived(id);
  }
}
