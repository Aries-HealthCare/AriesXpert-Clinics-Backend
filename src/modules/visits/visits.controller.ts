import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { VisitsService } from "./visits.service";
import { JwtAuthGuard } from "../../common/guards";

@Controller("visits")
@UseGuards(JwtAuthGuard)
export class VisitsController {
  constructor(private visitsService: VisitsService) { }

  @Get()
  async getVisits(
    @Query("clinicId") clinicId?: string,
    @Query("patientId") patientId?: string,
    @Query("therapistId") therapistId?: string,
    @Query("status") status?: string,
  ) {
    try {
      const visits = await this.visitsService.getAllVisits({
        clinicId,
        patientId,
        therapistId,
        status,
      });
      return {
        success: true,
        data: visits,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post("start")
  async startVisit(
    @Body() dto: { appointmentId: string; therapistId: string },
  ) {
    try {
      const visit = await this.visitsService.startVisit(
        dto.appointmentId,
        dto.therapistId,
      );

      return {
        success: true,
        data: visit,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post("assessment")
  async createAssessment(@Body() dto: any) {
    try {
      const visit = await this.visitsService.saveAssessment(dto);
      return {
        success: true,
        data: visit,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Put(":visitId/complete")
  async completeVisit(
    @Param("visitId") visitId: string,
    @Body()
    completeDto: {
      treatmentNotes: string;
      exercisesPrescribed: string[];
      nextVisitDate?: Date;
    },
  ) {
    try {
      const result = await this.visitsService.completeVisit(
        visitId,
        completeDto,
      );

      return {
        success: true,
        message: "Visit completed. Invoice generated.",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(":visitId")
  async getVisit(@Param("visitId") visitId: string) {
    try {
      const visit = await this.visitsService.getVisitById(visitId);

      return {
        success: true,
        data: visit,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("therapist/:therapistId")
  async getTherapistVisits(
    @Param("therapistId") therapistId: string,
    @Query("month") month?: string,
  ) {
    try {
      const visits = await this.visitsService.getTherapistVisits(
        therapistId,
        month,
      );

      return {
        success: true,
        data: visits,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
