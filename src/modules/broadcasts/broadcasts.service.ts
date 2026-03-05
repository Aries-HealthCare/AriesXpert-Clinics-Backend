import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Broadcast } from "./schemas/broadcast.schema";
import { BroadcastListing } from "./schemas/broadcast-listing.schema";
import { Patient } from "../patients/schemas/patient.schema";
import { Therapist } from "../therapists/schemas/therapist.schema";
import { Lead } from "../leads/schemas/lead.schema";
import { Visit } from "../appointments/schemas/visit.schema";
import { WhatsAppService } from "../whatsapp/services/whatsapp.service";
import { PushNotificationsService } from "./push-notifications.service";
import { AiService } from "../ai/ai.service";

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    @InjectModel(Broadcast.name) private broadcastModel: Model<Broadcast>,
    @InjectModel(BroadcastListing.name)
    private broadcastListingModel: Model<BroadcastListing>,
    @InjectModel(Lead.name) private leadModel: Model<Lead>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Therapist.name) private therapistModel: Model<Therapist>,
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    private readonly pushNotificationsService: PushNotificationsService,
    private readonly whatsAppService: WhatsAppService,
    private readonly aiService: AiService,
  ) { }

  async getStats(): Promise<any> {
    const total = await this.broadcastModel.countDocuments({
      isDeleted: false,
    });
    const active = await this.broadcastModel.countDocuments({
      isDeleted: false,
      $or: [
        { broadcastStatus: "Open" },
        { broadcastStatus: { $exists: false }, isActive: true },
      ],
    });
    const completed = await this.broadcastModel.countDocuments({
      isDeleted: false,
      broadcastStatus: "Allotted",
    });

    const responses = await this.broadcastListingModel.countDocuments({});

    return {
      total,
      active,
      completed,
      responses,
    };
  }

  async createBroadcast(createBroadcastDto: any): Promise<Broadcast> {
    try {
      const { targetTherapists, ...broadcastData } = createBroadcastDto;

      const broadcast = new this.broadcastModel({
        ...broadcastData,
        broadcastStatus: "ACTIVE",
      });
      const savedBroadcast = await broadcast.save();

      // Find eligible therapists
      let eligibleTherapistIds: string[] = [];

      if (targetTherapists && targetTherapists.length > 0) {
        eligibleTherapistIds = targetTherapists;
      } else {
        // Fallback filtering logic (Phase 2)
        const query: any = {
          status: "ACTIVE",
          isDeleted: { $ne: true },
          // Filter by city if available
          city: broadcastData.location?.city ? new RegExp(broadcastData.location.city, "i") : { $exists: true },
        };

        const potentialTherapists = await this.therapistModel.find(query).select("_id userId fcmToken").lean();
        eligibleTherapistIds = potentialTherapists.map(t => t._id.toString());
      }

      const fcmTokens: string[] = [];

      // Create lead entries for each eligible therapist (Phase 3)
      const listings = eligibleTherapistIds.map(tid => ({
        broadcast: savedBroadcast._id,
        therapist: tid,
        therapistResponse: "PENDING",
      }));

      await this.broadcastListingModel.insertMany(listings);

      // Collect FCM tokens for Instant Push (Phase 4)
      const therapists = await this.therapistModel.find({ _id: { $in: eligibleTherapistIds } }).select("fcmToken userId").lean();
      therapists.forEach(t => {
        if (t.fcmToken) fcmTokens.push(t.fcmToken);
      });

      // Trigger Push Notifications (Phase 4)
      if (fcmTokens.length > 0) {
        await this.pushNotificationsService.broadcastToMultiple(fcmTokens, {
          title: "New Patient Lead Available",
          body: `A new ${broadcastData.serviceType || 'case'} is available in ${broadcastData.location?.area || broadcastData.location?.city || 'your area'}.`,
          data: {
            type: "broadcast_lead",
            id: savedBroadcast._id.toString(),
            patient: broadcastData.patientName || "AriesXpert",
          }
        });
      }

      this.logger.log(`Broadcast ${savedBroadcast._id} created and sent to ${eligibleTherapistIds.length} therapists.`);
      return await savedBroadcast.populate("patient");
    } catch (error) {
      this.logger.error("Error creating broadcast:", error);
      throw new BadRequestException("Failed to create broadcast: " + error.message);
    }
  }

  async getAllBroadcasts(
    filters: {
      city?: string;
      status?: string;
      therapistId?: string;
      clinicId?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    limit: number;
    skip: number;
  }> {
    try {
      const query: any = {
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      };

      if (filters.city) {
        query["location.city"] = new RegExp(filters.city, "i");
      }
      if (filters.status) query.broadcastStatus = filters.status;
      if (filters.therapistId) query.therapists = filters.therapistId;
      if (filters.clinicId) query.clinicId = filters.clinicId;

      const limit = Number(filters.limit) || 10;
      const skip = Number(filters.skip) || 0;

      const total = await this.broadcastModel.countDocuments(query);
      const data = await this.broadcastModel
        .find(query)
        .populate("patient")
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .lean();

      return {
        data: data.map((b: any) => this.transformBroadcast(b)),
        total,
        limit,
        skip,
      };
    } catch (error) {
      this.logger.error("Error fetching broadcasts:", error);
      throw new BadRequestException("Failed to fetch broadcasts: " + error.message);
    }
  }

  async getTherapistByUserId(userId: string): Promise<Therapist | null> {
    return this.therapistModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  async getBroadcastById(id: string): Promise<any> {
    try {
      const broadcast = await this.broadcastModel
        .findById(id)
        .populate("patient")
        .lean();

      if (!broadcast) throw new NotFoundException("Broadcast not found");

      const legacyTherapistIds = broadcast.therapists || [];
      const legacyTherapists = await this.therapistModel
        .find({ _id: { $in: legacyTherapistIds } })
        .select("firstName lastName email phone specialization rating profileImage")
        .lean();

      const listings = await this.broadcastListingModel
        .find({ broadcast: id })
        .populate("therapist", "firstName lastName email phone specialization rating profileImage")
        .lean();

      const mergedTherapists = new Map();

      legacyTherapists.forEach((t: any) => {
        mergedTherapists.set(t._id.toString(), {
          _id: t._id,
          firstName: t.firstName || t.name?.split(" ")[0] || "Unknown",
          lastName: t.lastName || t.name?.split(" ").slice(1).join(" ") || "",
          profileImage: t.profileImage || t.profilePhoto,
          rating: t.rating || 0,
          responseStatus: "Interested",
          distance: 0,
        });
      });

      for (const l of listings) {
        if (l.therapist) {
          // If therapist field is an object (due to populate)
          if (typeof l.therapist === 'object' && (l.therapist as any)._id) {
            const t = l.therapist as any;
            mergedTherapists.set(t._id.toString(), {
              _id: t._id,
              firstName: t.firstName || "Unknown",
              lastName: t.lastName || "",
              profileImage: t.profileImage,
              rating: t.rating || 0,
              responseStatus: l.therapistResponse || "Pending",
              distance: 0,
            });
          } else {
            // If therapist field is just an ID (populate failed)
            const tid = (l.therapist as any).toString();
            if (!mergedTherapists.has(tid)) {
              // Try to find the therapist profile from our injected model
              const t: any = await this.therapistModel.findById(tid).lean();
              if (t) {
                mergedTherapists.set(tid, {
                  _id: t._id,
                  firstName: t.firstName,
                  lastName: t.lastName,
                  profileImage: t.profileImage,
                  rating: t.rating || 0,
                  responseStatus: l.therapistResponse || "Pending",
                  distance: 0,
                });
              } else {
                mergedTherapists.set(tid, {
                  _id: tid,
                  firstName: "Unknown",
                  lastName: "",
                  responseStatus: l.therapistResponse || "Pending",
                  distance: 0,
                });
              }
            }
          }
        }
      }

      const transformed = this.transformBroadcast(broadcast);
      return {
        ...transformed,
        interestedTherapists: Array.from(mergedTherapists.values()),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error fetching broadcast ${id}:`, error);
      throw new BadRequestException("Failed to fetch broadcast: " + error.message);
    }
  }

  async updateBroadcast(id: string, updateBroadcastDto: any): Promise<any> {
    try {
      const broadcast = await this.broadcastModel
        .findByIdAndUpdate(id, { $set: updateBroadcastDto }, { new: true, runValidators: true })
        .populate("patient");

      if (!broadcast) throw new NotFoundException("Broadcast not found");
      return this.transformBroadcast(broadcast);
    } catch (error) {
      this.logger.error("Error updating broadcast:", error);
      throw new BadRequestException("Failed to update broadcast: " + error.message);
    }
  }

  async updateBroadcastStatus(id: string, status: "Open" | "Allotted" | "Cancelled"): Promise<any> {
    try {
      const broadcast = await this.broadcastModel
        .findByIdAndUpdate(id, { broadcastStatus: status }, { new: true, runValidators: true })
        .populate("patient");

      if (!broadcast) throw new NotFoundException("Broadcast not found");
      return this.transformBroadcast(broadcast);
    } catch (error) {
      this.logger.error("Error updating broadcast status:", error);
      throw new BadRequestException("Failed to update broadcast status: " + error.message);
    }
  }

  async deleteBroadcast(id: string): Promise<{ success: boolean }> {
    try {
      const broadcast = await this.broadcastModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
      if (!broadcast) throw new NotFoundException("Broadcast not found");
      return { success: true };
    } catch (error) {
      this.logger.error("Error deleting broadcast:", error);
      throw new BadRequestException("Failed to delete broadcast: " + error.message);
    }
  }

  async getInterestedTherapists(broadcastId: string): Promise<any[]> {
    try {
      const broadcast = await this.broadcastModel.findById(broadcastId).lean();
      if (!broadcast) throw new NotFoundException("Broadcast not found");

      const therapistIds = broadcast.therapists || [];
      const therapists = await this.therapistModel
        .find({ _id: { $in: therapistIds }, isDeleted: false })
        .select("firstName lastName email phone specialization rating")
        .lean();

      return therapists;
    } catch (error) {
      this.logger.error("Error fetching interested therapists:", error);
      throw new BadRequestException("Failed to fetch interested therapists: " + error.message);
    }
  }

  async markTherapistInterested(broadcastId: string, therapistId: string): Promise<any> {
    try {
      const broadcast = await this.broadcastModel
        .findByIdAndUpdate(broadcastId, { $addToSet: { therapists: therapistId } }, { new: true })
        .populate("patient");

      if (!broadcast) throw new NotFoundException("Broadcast not found");
      return this.transformBroadcast(broadcast);
    } catch (error) {
      this.logger.error("Error marking therapist as interested:", error);
      throw new BadRequestException("Failed to mark therapist as interested: " + error.message);
    }
  }

  async markTherapistNotInterested(broadcastId: string, therapistId: string): Promise<any> {
    try {
      const broadcast = await this.broadcastModel
        .findByIdAndUpdate(broadcastId, { $pull: { therapists: therapistId } }, { new: true })
        .populate("patient");

      if (!broadcast) throw new NotFoundException("Broadcast not found");
      return this.transformBroadcast(broadcast);
    } catch (error) {
      this.logger.error("Error marking therapist as not interested:", error);
      throw new BadRequestException("Failed to mark therapist as not interested: " + error.message);
    }
  }

  async findBroadcasts(filters: { therapistId?: string; location?: string; radius?: number; }): Promise<any[]> {
    try {
      const query: any = {
        isDeleted: false,
        $or: [
          { broadcastStatus: "Open" },
          { broadcastStatus: { $exists: false }, isActive: true },
        ],
      };

      if (filters.location) query["location.city"] = new RegExp(filters.location, "i");
      if (filters.therapistId) query.therapists = { $ne: filters.therapistId };

      const broadcasts = await this.broadcastModel
        .find(query)
        .populate("patient")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return broadcasts.map((broadcast: any) => this.transformBroadcastForTherapist(broadcast));
    } catch (error) {
      this.logger.error("Error finding broadcasts:", error);
      throw new BadRequestException("Failed to find broadcasts: " + error.message);
    }
  }

  async getBroadcastListings(broadcastId?: string, filters: any = {}): Promise<any[]> {
    try {
      const query: any = { isDeleted: false };
      if (broadcastId) query._id = broadcastId;
      if (filters.status) query.broadcastStatus = filters.status;
      if (filters.city) query["location.city"] = new RegExp(filters.city, "i");

      const broadcasts = await this.broadcastModel
        .find(query)
        .populate("patient")
        .sort({ createdAt: -1 })
        .lean();

      return broadcasts.map((broadcast: any) => this.transformBroadcast(broadcast));
    } catch (error) {
      this.logger.error("Error fetching broadcast listings:", error);
      throw new BadRequestException("Failed to fetch broadcast listings: " + error.message);
    }
  }

  async broadcastLeadToTherapists(lead: any) {
    try {
      const potentialTherapists = await this.therapistModel.find({ isActive: true, isDeleted: false });
      if (!potentialTherapists || potentialTherapists.length === 0) return;

      const scoredTherapists = await Promise.all(
        potentialTherapists.map(async (therapist) => {
          const score = await this.aiService.scoreTherapistMatch(lead, therapist);
          return { therapist, score };
        }),
      );

      const bestMatches = scoredTherapists
        .filter((item) => item.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (bestMatches.length === 0) return;

      lead.status = "broadcasting";
      lead.broadcastStartedAt = new Date();
      lead.broadcastExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await lead.save();

      for (const match of bestMatches) {
        const t = match.therapist as any;
        if (!t?.phone) continue;
        try {
          await this.whatsAppService.sendSimpleTemplateMessage(t.phone, "lead_broadcast", {
            patient_area: lead.area,
            patient_condition: lead.condition,
            match_score: match.score.toString(),
          });
        } catch (error) { this.logger.error(`WhatsApp fail for ${t.phone}: ${error.message}`); }
      }
      return lead;
    } catch (error) {
      this.logger.error("Broadcast error:", error);
      throw error;
    }
  }

  async getMyLeads(therapistId: string, status?: string): Promise<any[]> {
    try {
      const query: any = { therapist: therapistId, isDeleted: false };
      if (status) query.therapistResponse = status.toUpperCase();

      const listings = await this.broadcastListingModel
        .find(query)
        .populate({
          path: "broadcast",
          populate: { path: "patient", select: "firstName lastName phone" }
        })
        .sort({ createdAt: -1 })
        .lean();

      return listings.map(l => this.transformLeadForMobile(l));
    } catch (error) {
      this.logger.error("Error fetching leads for therapist:", error);
      throw new BadRequestException("Failed to fetch leads");
    }
  }

  async acceptLead(broadcastId: string, therapistId: string): Promise<any> {
    const session = await this.broadcastListingModel.db.startSession();
    session.startTransaction();
    try {
      const broadcast = await this.broadcastModel.findById(broadcastId).session(session);
      if (!broadcast) throw new NotFoundException("Broadcast not found");

      if (broadcast.broadcastStatus !== "ACTIVE") {
        throw new BadRequestException("This lead is no longer active (already allotted or expired).");
      }

      const listing = await this.broadcastListingModel.findOne({
        broadcast: broadcastId,
        therapist: therapistId
      }).session(session);

      if (!listing) throw new NotFoundException("Lead assignment not found for this specialist");
      if (listing.therapistResponse !== "PENDING") {
        throw new BadRequestException(`Lead is already ${listing.therapistResponse.toLowerCase()}.`);
      }

      // 1. Lock lead for this therapist
      listing.therapistResponse = "ACCEPTED";
      listing.respondedAt = new Date();
      await listing.save({ session });

      // 2. Close broadcast for all others (First Come First Serve - Phase 7)
      broadcast.broadcastStatus = "CLOSED";
      broadcast.isActive = false;
      await broadcast.save({ session });

      // 3. Mark all other pending listings as EXPIRED for this broadcast
      await this.broadcastListingModel.updateMany(
        { broadcast: broadcastId, therapist: { $ne: therapistId }, therapistResponse: "PENDING" },
        { $set: { therapistResponse: "EXPIRED" } },
        { session }
      );

      // 4. Transform into a Visit/Appointment (Phase 6)
      const visit = new this.visitModel({
        patient: broadcast.patient,
        therapist: therapistId,
        serviceType: broadcast.serviceTypes?.[0] || broadcast.professionalRole || "Therapy",
        scheduledDate: new Date(broadcast.preferredAppointmentDate),
        scheduledTime: broadcast.preferredAppointmentTime,
        visitStatus: "Scheduled",
      });
      await visit.save({ session });

      await session.commitTransaction();
      this.logger.log(`Broadcast ${broadcastId} ACCEPTED and converted to visit by therapist ${therapistId}`);

      // 5. Push Notifications — run AFTER commit so no rollback risk
      // 5a. Notify the winning therapist
      try {
        const winnerTherapist = await this.therapistModel.findById(therapistId).select("fcmToken name firstName").lean();
        if (winnerTherapist?.fcmToken) {
          await this.pushNotificationsService.broadcastToMultiple([winnerTherapist.fcmToken], {
            title: "🎉 Lead Accepted!",
            body: `You've been assigned to a new patient. Visit scheduled for ${broadcast.preferredAppointmentDate || 'soon'}.`,
            data: {
              type: "lead_accepted",
              broadcastId: broadcastId,
              visitId: visit._id.toString(),
            }
          });
        }
      } catch (pushErr) {
        this.logger.warn(`FCM push to winner failed (non-critical): ${pushErr.message}`);
      }

      // 5b. Notify expired therapists that this lead is no longer available
      try {
        const expiredListings = await this.broadcastListingModel
          .find({ broadcast: broadcastId, therapist: { $ne: therapistId }, therapistResponse: "EXPIRED" })
          .populate("therapist", "fcmToken")
          .lean();
        const expiredTokens: string[] = expiredListings
          .map((l: any) => l.therapist?.fcmToken)
          .filter(Boolean);
        if (expiredTokens.length > 0) {
          await this.pushNotificationsService.broadcastToMultiple(expiredTokens, {
            title: "Lead Assigned to Another Specialist",
            body: "A patient lead you were notified about has been taken by another therapist.",
            data: { type: "lead_expired", broadcastId }
          });
        }
      } catch (pushErr) {
        this.logger.warn(`FCM push to expired therapists failed (non-critical): ${pushErr.message}`);
      }

      return { success: true, message: "Lead successfully accepted and visit created." };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error("Failed to accept lead:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async rejectLead(broadcastId: string, therapistId: string): Promise<any> {
    try {
      const listing = await this.broadcastListingModel.findOneAndUpdate(
        { broadcast: broadcastId, therapist: therapistId },
        { $set: { therapistResponse: "REJECTED", respondedAt: new Date() } },
        { new: true }
      );
      if (!listing) throw new NotFoundException("Lead assignment not found");
      return { success: true, message: "Lead successfully rejected." };
    } catch (error) {
      throw new BadRequestException("Failed to reject lead: " + error.message);
    }
  }

  async markLeadViewed(broadcastId: string, therapistId: string): Promise<any> {
    return this.broadcastListingModel.findOneAndUpdate(
      { broadcast: broadcastId, therapist: therapistId, viewedAt: { $exists: false } },
      { $set: { viewedAt: new Date() } },
      { new: true }
    );
  }

  private transformLeadForMobile(listing: any): any {
    if (!listing || !listing.broadcast) return null;
    const b = listing.broadcast;
    const location = b.location || {};

    return {
      id: b._id,
      listingId: listing._id,
      patientName: b.patientName || (b.patient ? `${b.patient.firstName || ''} ${b.patient.lastName || ''}`.trim() : "Patient"),
      medicalConcern: b.medicalConcern,
      serviceRequired: b.professionalRole,
      serviceType: b.serviceTypes?.[0] || "Home Visit",
      location: `${location.city || ''} - ${(location.areas || []).join(", ")}`,
      payout: b.amountPerSession || 0,
      scheduledDate: b.preferredAppointmentDate,
      scheduledTime: b.preferredAppointmentTime,
      leadStatus: listing.therapistResponse,
      viewedAt: listing.viewedAt,
      respondedAt: listing.respondedAt,
      createdAt: b.createdAt,
    };
  }

  private transformBroadcast(broadcast: any): any {
    if (!broadcast) return null;
    const patient = broadcast.patient || {};
    const location = broadcast.location || {};
    const city = location.city || "";
    const area = Array.isArray(location.areas) ? location.areas.join(", ") : "";

    return {
      _id: broadcast._id,
      id: broadcast._id,
      patient: patient,
      patientName: broadcast.patientName || (patient.firstName
        ? `${patient.firstName} ${patient.lastName}`.trim()
        : (patient.name || "Unknown")),
      medicalConcern: broadcast.medicalConcern || "Not specified",
      professionalRole: broadcast.professionalRole,
      serviceTypes: broadcast.serviceTypes || [],
      location: location,
      locationString: [city, area].filter(Boolean).join(", "),
      therapistExperience: broadcast.therapistExperience,
      amountPerSession: broadcast.amountPerSession || 0,
      broadcastStatus: broadcast.broadcastStatus || (broadcast.isActive ? "ACTIVE" : "CLOSED"),
      preferredAppointmentTime: broadcast.preferredAppointmentTime,
      preferredAppointmentDate: broadcast.preferredAppointmentDate,
      interestedTherapists: broadcast.therapists?.length || 0,
      therapists: broadcast.therapists || [],
      expiresIn: broadcast.expiresIn,
      isActive: broadcast.isActive !== undefined ? broadcast.isActive : true,
      isDeleted: broadcast.isDeleted || false,
      createdAt: broadcast.createdAt,
      updatedAt: broadcast.updatedAt,
    };
  }

  private transformBroadcastForTherapist(broadcast: any): any {
    if (!broadcast) return null;
    const location = broadcast.location || {};
    return {
      id: broadcast._id,
      patientName: broadcast.patientName || (broadcast.patient
        ? `${broadcast.patient.firstName || 'Patient'} ${broadcast.patient.lastName || ''}`.trim()
        : "Unknown Patient"),
      medicalConcern: broadcast.medicalConcern,
      location: `${location.city || ''} - ${(location.areas || []).join(", ")}`,
      preferredAppointmentTime: broadcast.preferredAppointmentTime,
      preferredAppointmentDate: broadcast.preferredAppointmentDate,
      therapistExperience: broadcast.therapistExperience,
      amountPerSession: broadcast.amountPerSession,
      interestedTherapists: broadcast.therapists?.length || 0,
      broadcastStatus: broadcast.broadcastStatus,
      expiresIn: broadcast.expiresIn,
      createdAt: broadcast.createdAt,
    };
  }
}
