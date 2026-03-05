import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectConnection as InjectConn } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";
import { LeadsService } from "./leads.service";
import { BroadcastsService } from "../broadcasts/broadcasts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

class CreateLeadDto {
  name: string;
  phone: string;
  email: string;
  city: string;
  area: string;
  condition: string;
  urgency?: string;
}

@Controller("leads")
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(

    private readonly leadsService: LeadsService,
    private readonly broadcastsService: BroadcastsService,
    @InjectConn() private readonly db: Connection,
  ) { }

  @Post("appointment")
  async createFromWebsite(@Body() dto: CreateLeadDto) {
    try {
      const lead = await this.leadsService.create(dto);
      const broadcast = await this.broadcastsService.broadcastLeadToTherapists(lead);
      return {
        success: true,
        message: "Your request has been received. A therapist will contact you soon.",
        data: { leadId: lead._id, broadcastId: broadcast._id },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post("public")
  createPublic(@Body() createLeadDto: any) {
    return this.leadsService.createPublicLead(createLeadDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role;
    let userClinicId = null;
    const clinicRoles = ["clinic_owner", "clinic_admin", "receptionist", "therapist", "physiotherapist", "accounts_manager"];
    if (clinicRoles.includes(userRole)) {
      userClinicId = req.user.clinicId;
    }
    return this.leadsService.findAll(query, userClinicId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createLeadDto: any) {
    try {
      // Auto-assign clinicId from user's token if available
      if (req.user?.clinicId && !createLeadDto.clinicId) {
        createLeadDto.clinicId = req.user.clinicId;
      }

      this.logger.log(`Creating Lead: ${JSON.stringify(createLeadDto)}`);
      const lead = await this.leadsService.create(createLeadDto);
      return lead;
    } catch (error) {
      this.logger.error(`Failed to create lead: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || "Failed to create lead");
    }
  }


  @Post(":id/convert")
  @UseGuards(JwtAuthGuard)
  async convertToPatient(@Param("id") id: string, @Request() req: any, @Body() patientData: any) {
    // Update lead status
    await this.leadsService.update(id, { status: "Converted" });
    // Create patient record
    const lead = await this.leadsService.findOne(id);
    const clinicId = new Types.ObjectId(req.user.clinicId || patientData.clinicId);
    const patient = {
      firstName: patientData.firstName || (lead as any).name?.split(' ')[0] || 'Unknown',
      lastName: patientData.lastName || (lead as any).name?.split(' ').slice(1).join(' ') || '',
      phone: patientData.phone || (lead as any).phone,
      email: patientData.email || (lead as any).email,
      age: patientData.age || (lead as any).age,
      gender: patientData.gender || (lead as any).gender,
      address: (lead as any).address,
      city: (lead as any).city,
      state: (lead as any).state,
      condition: patientData.condition || (lead as any).condition,
      clinicId,
      source: 'Lead',
      stage: 'Patient',
      status: 'Active',
      isActive: true,
      isDeleted: false,
      referredBy: (lead as any).referredBy,
      referralCodeUsed: (lead as any).referralCodeUsed,
      isReferred: !!(lead as any).referredBy,
      createdAt: new Date(),
    };
    const result = await this.db.collection('patients').insertOne(patient);
    return { success: true, patientId: result.insertedId, lead };
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() updateLeadDto: any) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.leadsService.remove(id);
  }

  /**
   * Simulation endpoint — injects a test lead and runs the broadcast pipeline.
   * Used by the Automation Engine tab in the Admin Dashboard.
   */
  @Post("simulate")
  @UseGuards(JwtAuthGuard)
  async simulateLead(@Body() body: { source?: string }, @Request() req: any) {
    const source = body?.source || 'website';
    const sourceNames: Record<string, string> = {
      'website': 'Website Forms',
      'google-ads': 'Google Ads',
      'meta-ads': 'Meta Ads',
      'justdial': 'Justdial',
    };

    const testLead: any = {
      name: `[TEST LEAD] Simulation Patient`,
      phone: '9999000000',
      email: 'simulation@test.ariesxpert.com',
      city: 'Mumbai',
      area: 'Andheri',
      condition: 'Back Pain (Test)',
      source: sourceNames[source] || 'Simulation',
      status: 'New',
      leadType: 'general',
      notes: `This is a simulated test lead from the Admin Automation Engine (source: ${source}).`,
      isSimulation: true,
    };

    try {
      const lead = await this.leadsService.create(testLead);
      // Attempt broadcast
      try {
        await this.broadcastsService.broadcastLeadToTherapists(lead);
      } catch (broadcastErr) {
        this.logger.warn(`Simulation broadcast failed (non-critical): ${broadcastErr.message}`);
      }
      return {
        success: true,
        message: `Simulation lead from "${sourceNames[source] || source}" injected and broadcast initiated.`,
        data: { leadId: lead._id },
      };
    } catch (error) {
      this.logger.error(`Lead simulation failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Simulation failed');
    }
  }
}
