import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ClinicsService } from "./clinics.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("clinics")
@UseGuards(AuthGuard("jwt"))
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) { }

  @Post()
  create(@Body() body: any) {
    return this.clinicsService.create(body);
  }

  @Get()
  async findAll() {
    const clinics = await this.clinicsService.findAll();
    return { clinics }; // Return in format expected by frontend { clinics: [...] }
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.clinicsService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.clinicsService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.clinicsService.remove(id);
  }

  // ==== Founder Control APIs ====

  @Post(":id/lock")
  async lockClinic(@Param("id") id: string) {
    return this.clinicsService.updateStatus(id, "locked");
  }

  @Post(":id/unlock")
  async unlockClinic(@Param("id") id: string) {
    return this.clinicsService.updateStatus(id, "active");
  }

  @Post(":id/suspend")
  async suspendClinic(@Param("id") id: string) {
    return this.clinicsService.updateStatus(id, "suspended");
  }

  @Post(":id/approve")
  async approveClinic(@Param("id") id: string) {
    return this.clinicsService.updateStatus(id, "active");
  }

  @Post(":id/reject")
  async rejectClinic(@Param("id") id: string) {
    return this.clinicsService.updateStatus(id, "rejected");
  }

  @Post(":id/request-info")
  async requestInfoClinic(@Param("id") id: string) {
    return this.clinicsService.updateStatus(id, "info_required");
  }

  @Post(":id/logout")
  async forceLogout(@Param("id") id: string) {
    return this.clinicsService.forceLogoutUsers(id);
  }

  @Post(":id/sync")
  async forceSync(@Param("id") id: string) {
    return this.clinicsService.forceSyncData(id);
  }

  @Post(":id/settings")
  async pushSettings(@Param("id") id: string, @Body() body: any) {
    return this.clinicsService.pushSettings(id, body);
  }
}
