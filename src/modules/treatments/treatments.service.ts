import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Treatment, TreatmentDocument } from "./schemas/treatment.schema";
import { Patient, PatientDocument } from "../patients/schemas/patient.schema";
import { Therapist, TherapistDocument } from "../therapists/schemas/therapist.schema";
import {
  LegacyTherapist,
  LegacyTherapistDocument,
} from "../therapists/schemas/legacy-therapist.schema";
import { Visit, VisitDocument } from "../appointments/schemas/visit.schema";

@Injectable()
export class TreatmentsService {
  private readonly logger = new Logger(TreatmentsService.name);

  constructor(
    @InjectModel(Treatment.name) private treatmentModel: Model<TreatmentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    @InjectModel(Therapist.name) private therapistModel: Model<TherapistDocument>,
    @InjectModel(LegacyTherapist.name)
    private legacyTherapistModel: Model<LegacyTherapistDocument>,
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
    private eventEmitter: EventEmitter2,
  ) { }

  /**
   * Create a new treatment
   */
  async createTreatment(createTreatmentDto: any): Promise<any> {
    try {
      const treatment = new this.treatmentModel(createTreatmentDto);
      const savedTreatment = await treatment.save();
      const populated = await this.populateTreatment(savedTreatment);

      this.eventEmitter.emit("treatment.created", populated);
      return populated;
    } catch (error) {
      this.logger.error("Error creating treatment:", error);
      throw new BadRequestException("Failed to create treatment");
    }
  }

  /**
   * Get all treatments with optional filters
   */
  async getAllTreatments(
    filters: {
      patientId?: string;
      therapistId?: string;
      status?: string;
      limit?: number;
      skip?: number;
      clinicId?: string;
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

      if (filters.patientId) query.patient = filters.patientId;
      if (filters.therapistId) query.expert = filters.therapistId;
      if (filters.status) query.paymentStatus = filters.status;
      if (filters.clinicId) query.clinicId = filters.clinicId;

      const limit = filters.limit || 10;
      const skip = filters.skip || 0;

      const total = await this.treatmentModel.countDocuments(query);
      const data = await this.treatmentModel
        .find(query)
        .populate("patient")
        .limit(limit)
        .skip(skip)
        .sort({ startDate: -1 })
        .lean();

      const populatedData = await Promise.all(
        data.map(async (t: any) => {
          let expert = t.expert;
          if (expert && expert.toString().length === 24) {
            try {
              const userTherapist = await this.therapistModel.findById(expert).select("firstName lastName email phone specialization").lean();
              if (userTherapist) {
                expert = userTherapist;
              } else {
                const legacy = await this.legacyTherapistModel.findById(expert).lean();
                if (legacy) {
                  expert = {
                    _id: legacy._id,
                    firstName: legacy.firstName || legacy.name?.split(" ")[0] || "Unknown",
                    lastName: legacy.lastName || legacy.name?.split(" ").slice(1).join(" ") || "",
                    email: legacy.email,
                    phone: legacy.phone,
                    specialization: legacy.specialization || (legacy as any).professionalInfo?.professionalRole,
                  };
                }
              }
            } catch (e) { }
          }
          return this.transformTreatment({ ...t, expert: expert });
        }),
      );

      return { data: populatedData, total, limit, skip };
    } catch (error) {
      throw new BadRequestException("Failed to fetch treatments");
    }
  }

  /**
   * Get treatment by ID
   */
  async getTreatmentById(id: string): Promise<any> {
    try {
      const treatment = await this.treatmentModel.findById(id).populate("patient").lean();

      if (!treatment) {
        throw new NotFoundException("Treatment not found");
      }

      let expert: any = treatment.expert;
      if (expert && expert.toString().length === 24) {
        try {
          const userTherapist = await this.therapistModel.findById(expert).select("firstName lastName email phone specialization").lean();
          if (userTherapist) {
            expert = userTherapist;
          } else {
            const legacy = await this.legacyTherapistModel.findById(expert).lean();
            if (legacy) {
              expert = {
                _id: legacy._id,
                firstName: legacy.firstName || legacy.name?.split(" ")[0] || "Unknown",
                lastName: legacy.lastName || legacy.name?.split(" ").slice(1).join(" ") || "",
                email: legacy.email,
                phone: legacy.phone,
                specialization: legacy.specialization || (legacy as any).professionalInfo?.professionalRole,
              } as any;
            }
          }
        } catch (e) { }
      }

      const totalAppointments = await this.visitModel.countDocuments({ treatment: id });
      const upcomingAppointments = await this.visitModel.countDocuments({
        treatment: id,
        visitDate: { $gte: new Date() },
        status: { $nin: ["completed", "cancelled"] },
      });

      let matchQuery: any = { treatment: id };
      try { matchQuery = { treatment: new Types.ObjectId(id) }; } catch (e) { }

      const paymentStats = await this.visitModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            collected: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amountDue", 0] } },
            pending: { $sum: { $cond: [{ $ne: ["$paymentStatus", "paid"] }, "$amountDue", 0] } },
          },
        },
      ]);

      const visitCollected = paymentStats[0]?.collected || 0;
      const visitPending = paymentStats[0]?.pending || 0;
      const treatmentCollected = (treatment as any).paidAmount || 0;

      const stats = {
        totalAppointments: totalAppointments || (treatment as any).sessions || 0,
        upcomingAppointments,
        paymentCollected: treatmentCollected + visitCollected,
        paymentPending: visitPending,
      };

      return {
        ...this.transformTreatment({ ...treatment, expert: expert }),
        stats,
      };
    } catch (error) {
      throw new NotFoundException("Treatment not found");
    }
  }

  async getTreatmentsByPatientId(patientId: string): Promise<any[]> {
    const treatments = await this.treatmentModel.find({ patient: patientId, isDeleted: false }).populate("patient").populate("expert", "firstName lastName email phone specialization").sort({ startDate: -1 }).lean();
    return treatments.map((t: any) => this.transformTreatment(t));
  }

  async getTreatmentsByTherapistId(therapistId: string): Promise<any[]> {
    const treatments = await this.treatmentModel.find({ expert: therapistId, isDeleted: false }).populate("patient").populate("expert", "firstName lastName email phone specialization").sort({ startDate: -1 }).lean();
    return treatments.map((t: any) => this.transformTreatment(t));
  }

  async updateTreatment(id: string, updateTreatmentDto: any): Promise<any> {
    const treatment = await this.treatmentModel.findByIdAndUpdate(id, { $set: updateTreatmentDto }, { new: true, runValidators: true }).populate("patient").populate("expert", "firstName lastName email phone specialization");
    if (!treatment) throw new NotFoundException("Treatment not found");
    return this.transformTreatment(treatment);
  }

  async deleteTreatment(id: string): Promise<{ success: boolean }> {
    const treatment = await this.treatmentModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!treatment) throw new NotFoundException("Treatment not found");
    return { success: true };
  }

  private async populateTreatment(treatment: any): Promise<any> {
    const populated = await this.treatmentModel.findById(treatment._id).populate("patient").populate("expert", "firstName lastName email phone specialization");
    return this.transformTreatment(populated);
  }

  private transformTreatment(treatment: any): any {
    const patient = treatment.patient || {};
    const expert: any = treatment.expert || {};
    if (expert._id && !expert.firstName && expert.name) {
      const parts = expert.name.split(" ");
      expert.firstName = parts[0];
      expert.lastName = parts.slice(1).join(" ");
    }
    const sessions = treatment.sessions || treatment.numberOfSessions || 0;
    const duration = treatment.duration || treatment.days || "";
    const treatmentName = treatment.treatmentName || treatment.condition || (treatment.treatmentType as any)?.name || "Treatment";

    return {
      _id: treatment._id,
      id: treatment._id,
      treatmentName,
      condition: treatmentName,
      patient,
      patientName: patient.firstName ? `${patient.firstName} ${patient.lastName}`.trim() : patient.name || "Unknown",
      expert,
      expertName: expert.firstName ? `${expert.firstName} ${expert.lastName}`.trim() : expert.name || "Unknown",
      startDate: treatment.startDate,
      preferenceTime: treatment.preferenceTime || treatment.time || "10:00",
      duration,
      sessions,
      paymentStatus: treatment.paymentStatus,
      paidAmount: treatment.paidAmount || treatment.price || 0,
      therapistSessionAmount: treatment.therapistSessionAmount,
      therapistProfessionalRole: treatment.therapistProfessionalRole || expert.specialization || "Physiotherapist",
      broadCastId: treatment.broadCastId,
      isActive: treatment.isActive !== undefined ? treatment.isActive : true,
      isDeleted: treatment.isDeleted || false,
      createdAt: treatment.createdAt,
      updatedAt: treatment.updatedAt,
      status: treatment.status || (treatment.isActive ? "Active" : "Inactive"),
      type: treatment.treatmentType || { name: "General" },
      packageId: treatment.packageId,
      packageName: treatment.packageName,
    };
  }

  async getStats() {
    const total = await this.treatmentModel.countDocuments({ isDeleted: false });
    const active = await this.treatmentModel.countDocuments({ isDeleted: false, isActive: true });
    return { total, active, completed: total - active };
  }

  async getRevenueStats(filters: any) {
    const query: any = { isDeleted: false, paymentStatus: 'paid' };
    if (filters) {
      if (filters.clinicId) query.clinicId = filters.clinicId;
      if (filters.startDate || filters.endDate) query.startDate = {};
      if (filters.startDate) query.startDate.$gte = filters.startDate;
      if (filters.endDate) query.startDate.$lte = filters.endDate;
    }

    const treatments = await this.treatmentModel.find(query).lean();
    const totalRevenue = treatments.reduce((sum, t) => sum + (Number((t as any).paidAmount) || 0), 0);
    return { totalRevenue, count: treatments.length };
  }

  async markPaymentReceived(id: string) {
    const treatment = await this.treatmentModel.findByIdAndUpdate(id, { paymentStatus: 'paid' }, { new: true });
    if (!treatment) throw new NotFoundException("Treatment not found");
    return treatment;
  }
}
