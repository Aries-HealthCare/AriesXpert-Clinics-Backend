import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LeadsService } from "../leads/leads.service";
import { TherapistsService } from "../therapists/therapists.service";
import { BroadcastsService } from "../communication/broadcasts.service";
import { VisitsService } from "../appointments/visits.service";
import { PatientsService } from "../patients/patients.service";

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly therapistsService: TherapistsService,
    private readonly broadcastsService: BroadcastsService,
    private readonly visitsService: VisitsService,
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * CRON JOB: Daily Stale Lead Check (Midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleStaleLeads() {
    this.logger.log("Running Daily Stale Lead Cleanup...");
    // Logic to find leads older than 7 days and mark as 'Stale' or re-broadcast
    // Placeholder for now
  }

  /**
   * 1. LEAD INGESTION & NORMALIZATION
   * Entry point for all leads (Website, Justdial, Ads, etc.)
   */
  async ingestLead(rawData: any) {
    this.logger.log(`Ingesting Lead from ${rawData.source || "Unknown"}`);

    // AI Normalization Logic (Rule-based for now)
    const normalizedLead = {
      name: rawData.name || rawData.patientName || "Unknown Patient",
      phone: this.normalizePhone(rawData.phone || rawData.mobile),
      email: rawData.email,
      serviceRequired:
        rawData.service || rawData.treatment || "General Physiotherapy",
      condition: rawData.condition || rawData.complaint || "Not specified",
      city: rawData.city || "Mumbai", // Default to HQ if missing
      area: rawData.area || rawData.locality || "",
      source: rawData.source || "Manual",
      preferredDate: rawData.preferredDate
        ? new Date(rawData.preferredDate)
        : new Date(),
      status: "New",
    };

    // Save Lead
    const savedLead = await this.leadsService.create(normalizedLead);
    this.logger.log(`Lead Created: ${savedLead._id}`);

    // Trigger Next Step: Broadcast
    await this.broadcastLead(savedLead);

    return {
      success: true,
      message: "Lead processed and broadcasted",
      leadId: savedLead._id,
    };
  }

  /**
   * 2. PRIVACY-SAFE BROADCASTING
   * Masks data and sends to eligible therapists
   */
  async broadcastLead(lead: any) {
    this.logger.log(`Broadcasting Lead: ${lead._id} in ${lead.city}`);

    // Find Eligible Therapists (Location Match)
    const eligibleTherapists = await this.therapistsService.findInCity(
      lead.city,
    );

    if (!eligibleTherapists || eligibleTherapists.length === 0) {
      this.logger.warn(
        `No therapists found in ${lead.city} for Lead ${lead._id}`,
      );
      return; // Or notify admin
    }

    // Mask Data
    const maskedDetails = {
      patientName: `${lead.name.substring(0, 4)}******`, // Masked
      condition: lead.condition,
      area: lead.area,
      city: lead.city,
      service: lead.serviceRequired,
      payout: "500", // Dynamic logic can go here
      leadId: lead._id,
    };

    // Create Broadcast Record
    await this.broadcastsService.create(
      {
        title: `New Lead in ${lead.area}`,
        message: `Patient for ${lead.serviceRequired}. Payout: ₹${maskedDetails.payout}`,
        type: "Lead",
        metadata: maskedDetails,
        interestedTherapists: [], // Empty initially
      },
      "507f1f77bcf86cd799439011",
    ); // System User ID

    // SIMULATE WHATSAPP SENDING HERE
    this.logger.log(
      `[MOCK] Sending WhatsApp to ${eligibleTherapists.length} therapists: "New Lead Available!"`,
    );
  }

  /**
   * 3. THERAPIST RESPONSE HANDLING
   * Auto-assigns if eligible
   */
  async handleTherapistResponse(
    leadId: string,
    therapistId: string,
    response: "Interested" | "Not Interested",
  ) {
    if (response === "Not Interested") return;

    this.logger.log(`Therapist ${therapistId} is Interested in Lead ${leadId}`);

    // Check if Lead is still open
    const lead = await this.leadsService.findOne(leadId);
    if (lead.assignedTo) {
      return { success: false, message: "Lead already assigned" };
    }

    // AUTO-ASSIGN LOGIC (First Click Wins for now)
    // In future: Add distance check here

    // 1. Assign Lead
    await this.leadsService.assignTherapist(leadId, therapistId);

    // 2. CONVERT LEAD TO PATIENT
    // Check if patient already exists (by phone)
    let patientId = leadId; // Default fallback
    const existingPatients = await this.patientsService.findAll({
      phone: lead.phone,
    });

    if (
      existingPatients &&
      (Array.isArray(existingPatients)
        ? existingPatients.length > 0
        : (existingPatients as any).data?.length > 0)
    ) {
      patientId = Array.isArray(existingPatients)
        ? existingPatients[0]._id
        : (existingPatients as any).data[0]._id;
      this.logger.log(`Existing Patient found: ${patientId}`);
    } else {
      const newPatient: any = await this.patientsService.create({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: {
          street: lead.address || lead.area,
          city: lead.city,
          state: lead.state,
          country: lead.country,
          zipCode: "000000", // Placeholder
        },
        condition: lead.condition,
        assignedTherapist: therapistId,
        status: "Active",
      });
      patientId = newPatient._id || newPatient.id;
      this.logger.log(`New Patient Created from Lead: ${patientId}`);
    }

    // 3. Create Visit / Treatment Record
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Schedule for tomorrow by default

    await this.visitsService.create({
      patientId: patientId, // Use the actual Patient ID now
      therapistId: therapistId,
      visitDate: appointmentDate,
      status: "Scheduled",
      type: lead.serviceRequired,
      location: {
        address: lead.address || lead.area,
        city: lead.city,
      },
    });

    // 4. Notify Admin & Therapist
    this.logger.log(
      `Lead ${leadId} assigned to Therapist ${therapistId} and converted to Patient ${patientId}`,
    );

    return {
      success: true,
      message: "Lead successfully assigned and converted to patient",
    };
  }

  private normalizePhone(phone: string): string {
    if (!phone) return "";
    return phone.replace(/[^0-9]/g, "");
  }
}
