import { Controller, Get, Post, Body, Put, Param, Query, UseGuards, Request } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("patients")
@UseGuards(AuthGuard("jwt"))
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  /**
   * Create new patient
   */
  @Post()
  create(@Body() createPatientDto: any) {
    return this.patientsService.create(createPatientDto);
  }

  /**
   * Get all patients with pagination and filters
   */
  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role;
    let userClinicId = null;

    if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
      userClinicId = req.user.clinicId;
    }

    return this.patientsService.findAll(query, userClinicId);
  }

  /**
   * Get patients by status
   */
  @Get("status/:status")
  async findByStatus(@Param("status") status: string) {
    return this.patientsService.findByStatus(status);
  }

  /**
   * Get patients by city
   */
  @Get("city/:city")
  async findByCity(@Param("city") city: string) {
    return this.patientsService.findByCity(city);
  }

  /**
   * Get single patient by ID
   */
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.patientsService.findOne(id);
  }

  /**
   * Update patient
   */
  @Put(":id")
  update(@Param("id") id: string, @Body() updatePatientDto: any) {
    return this.patientsService.update(id, updatePatientDto);
  }
}
