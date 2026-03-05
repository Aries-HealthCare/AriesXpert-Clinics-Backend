import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WhatsAppEventService, WhatsAppEventType } from "../whatsapp/services/whatsapp-event.service";
import { Visit, VisitDocument, VisitSchema } from "./schemas/visit.schema";
import {
  LegacyTherapist,
  LegacyTherapistDocument,
} from "../therapists/schemas/legacy-therapist.schema";
import { WalletService } from "../finance/wallet.service";
import { FinanceService } from "../finance/finance.service";
import { Assessment, AssessmentDocument, AssessmentSchema } from "./schemas/assessment.schema";
import { TenantConnectionService } from "../../common/multitenancy/tenant-connection.service";
import { ReferralsService } from "../referrals/referrals.service";

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
    @InjectModel(LegacyTherapist.name)
    private legacyTherapistModel: Model<LegacyTherapistDocument>,
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
    private readonly walletService: WalletService,
    private readonly financeService: FinanceService,
    private eventEmitter: EventEmitter2,
    private whatsappEventService: WhatsAppEventService,
    @Inject(forwardRef(() => ReferralsService))
    private referralsService: ReferralsService,
  ) { }

  /**
   * CRON: Send reminders for today's appointments (Daily at 8 AM)
   * This runs against the Main Command Center database by default.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // CRON always runs in shared/global context unless we implement tenant-aware cron
    const appointments = await this.visitModel.find({
      visitDate: { $gte: today, $lt: tomorrow },
      status: "Scheduled",
      isDeleted: false,
    }).populate("patientId");

    for (const appt of appointments) {
      if (appt.patientId) {
        await this.whatsappEventService.emitWhatsAppEvent({
          type: WhatsAppEventType.APPOINTMENT_REMINDER,
          phoneNumber: (appt.patientId as any).phone,
          templateName: "appointment_reminder_today",
          variables: { time: appt.appointmentTime },
          appointmentId: appt._id.toString(),
        });

        appt.status = "Reminder Sent";
        await appt.save();
      }
    }
    this.logger.log(`Sent today's reminders for ${appointments.length} appointments.`);
  }

  async getStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const totalToday = await this.visitModel.countDocuments({
      visitDate: { $gte: today, $lt: tomorrow },
      isDeleted: false,
    });

    const scheduled = await this.visitModel.countDocuments({
      isDeleted: false,
      status: "scheduled",
    });
    const completed = await this.visitModel.countDocuments({
      isDeleted: false,
      status: "completed",
    });
    const inProgress = await this.visitModel.countDocuments({
      isDeleted: false,
      status: "in_progress",
    });

    return {
      totalToday,
      scheduled,
      completed,
      inProgress,
    };
  }

  async create(createVisitDto: any) {
    const visit = new this.visitModel(createVisitDto);
    return visit.save();
  }

  async startVisit(id: string) {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);

    const status = visit["status"] || visit["appointmentStatus"] || "scheduled";

    if (status !== "scheduled" && status !== "pending") {
      if (status === "in_progress") return visit;
      throw new ForbiddenException(`Cannot start visit in status ${status}`);
    }

    visit.status = "in_progress";
    visit.visitStatus = "in_progress";
    visit.startTime = new Date();
    await visit.save();

    // Broadcast tactical event
    this.eventEmitter.emit('visit.started', visit);

    return visit;
  }

  async createAssessment(visitId: string, data: any): Promise<Assessment> {
    const assessment = new this.assessmentModel({
      ...data,
      visitId,
    });
    return assessment.save();
  }

  async findAssessmentsByVisit(visitId: string): Promise<Assessment[]> {
    return this.assessmentModel.find({ visitId }).exec();
  }

  async getAssessmentsByClinic(clinicId: string): Promise<AssessmentDocument[]> {
    return this.assessmentModel.find({ clinicId })
      .populate("patientId", "firstName lastName name")
      .populate("therapistId", "firstName lastName name")
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(query: any, userClinicId?: string) {
    const { therapistId, patientId, page = 1, limit = 10, status } = query;
    const effectiveClinicId = userClinicId || query.clinicId;

    const filter: any = {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    };

    if (effectiveClinicId) {
      filter.clinicId = effectiveClinicId;
    }

    const conditions = [];
    if (therapistId) {
      conditions.push({
        $or: [
          { therapistId: therapistId },
          { therapist: therapistId },
          { expert: therapistId },
        ],
      });
    }

    if (patientId) {
      conditions.push({
        $or: [{ patientId: patientId }, { patient: patientId }],
      });
    }

    if (status) {
      const statusMap = {
        scheduled: ["Scheduled", "scheduled"],
        completed: ["Completed", "completed"],
        cancelled: ["Cancelled", "cancelled"],
      };
      const searchStatus = statusMap[status.toLowerCase()] || [status];

      conditions.push({
        $or: [
          { status: { $in: searchStatus } },
          { appointmentStatus: { $in: searchStatus } },
          { visitStatus: { $in: searchStatus } },
        ],
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const visits = await this.visitModel
      .find(filter)
      .populate("patientId")
      .populate("patient")
      .populate("therapistId")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ visitDate: -1, appointmentDate: -1 })
      .lean()
      .exec();

    const mappedVisits = await Promise.all(
      visits.map(async (v: any) => {
        const patient = v.patientId || v.patient || {};
        let therapist = v.therapistId || {};

        if (!therapist._id || !therapist.firstName) {
          const legacyId = v.therapist || v.expert;
          if (legacyId && legacyId.toString().length === 24) {
            try {
              const found: any = await this.legacyTherapistModel.findById(legacyId).lean();
              if (found) {
                therapist = {
                  _id: found._id,
                  firstName: found.firstName || found.name?.split(" ")[0] || "Unknown",
                  lastName: found.lastName || found.name?.split(" ").slice(1).join(" ") || "",
                  email: found.email,
                  phone: found.phone,
                  specialization: found.specialization || found.professionalInfo?.professionalRole,
                  profileImage: found.profileImage || found.profilePhoto,
                };
              }
            } catch (e) { }
          }
        }

        const startTime = v.startTime || v.visitDate || v.appointmentDate;

        return {
          ...v,
          id: v._id.toString(),
          patientId: patient._id || v.patientId,
          therapistId: therapist._id || v.therapistId,
          startTime: startTime,
          status: v.status || v.appointmentStatus || "scheduled",
          amountDue: v.amountDue || parseInt(v.sessionAmount) || 0,
          patient: patient,
          therapist: therapist,
        };
      }),
    );

    const count = await this.visitModel.countDocuments(filter);

    return {
      visits: mappedVisits,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findOne(id: string) {
    const visit: any = await this.visitModel
      .findById(id)
      .populate("patientId")
      .populate("patient")
      .populate("therapistId")
      .lean()
      .exec();

    if (!visit) throw new NotFoundException(`Visit #${id} not found`);

    const patient = visit.patientId || visit.patient || {};
    let therapist = visit.therapistId || {};

    if (!therapist._id || !therapist.firstName) {
      const legacyId = visit.therapist || visit.expert;
      if (legacyId && legacyId.toString().length === 24) {
        try {
          const found: any = await this.legacyTherapistModel.findById(legacyId).lean();
          if (found) {
            therapist = {
              _id: found._id,
              firstName: found.firstName || found.name?.split(" ")[0] || "Unknown",
              lastName: found.lastName || found.name?.split(" ").slice(1).join(" ") || "",
              email: found.email,
              phone: found.phone,
              specialization: found.specialization || found.professionalInfo?.professionalRole,
              profileImage: found.profileImage || found.profilePhoto,
            };
          }
        } catch (e) { }
      }
    }

    const startTime = visit.startTime || visit.visitDate || visit.appointmentDate;

    return {
      ...visit,
      id: visit._id.toString(),
      patientId: patient._id || visit.patientId,
      therapistId: therapist._id || visit.therapistId,
      startTime: startTime,
      status: visit.status || visit.appointmentStatus || "scheduled",
      amountDue: visit.amountDue || parseInt(visit.sessionAmount) || 0,
      patient: patient,
      therapist: therapist,
    };
  }

  async update(id: string, updateVisitDto: any) {
    const visit = await this.visitModel
      .findByIdAndUpdate(id, updateVisitDto, { new: true })
      .exec();
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);
    return visit;
  }

  async completeVisit(
    visitId: string,
    therapistId: string,
    paymentMethod: "CASH" | "ONLINE" = "ONLINE",
  ) {
    const visit: any = await this.visitModel
      .findById(visitId)
      .populate("patientId")
      .populate("patient");
    if (!visit) throw new NotFoundException(`Visit #${visitId} not found`);

    const status = visit.status || visit.appointmentStatus;
    if (status === "completed") return visit;

    visit.completedAt = new Date();
    const startTime = visit.startTime || visit.appointmentDate;

    if (startTime) {
      const durationMs = visit.completedAt.getTime() - new Date(startTime).getTime();
      visit.duration = Math.round(durationMs / 60000); // Minutes
    } else {
      visit.duration = 60;
    }

    if (paymentMethod === "CASH") {
      const amount = visit.amountDue || 500;
      await this.walletService.recordTransaction(
        therapistId,
        amount,
        "CASH",
        "India",
        `VISIT-${visitId}`,
      );
      visit.paymentStatus = "paid";
      visit.amountPaid = amount;
    }

    if (visit.paymentRequired && visit.paymentStatus !== "paid") {
      throw new ForbiddenException(`Payment required before visit completion.`);
    }

    visit.status = "completed";
    visit.visitStatus = "completed";
    await visit.save();

    // Broadcast tactical event
    this.eventEmitter.emit('visit.completed', visit);

    // Trigger Referral Bonus
    try {
      const professionalFee = parseFloat(visit.sessionAmount) || 0;
      const patientObj = (visit.patientId || visit.patient) as any;
      if (professionalFee > 0 && patientObj) {
        await this.referralsService.processVisitBonus(
          visit._id.toString(),
          patientObj._id.toString(),
          professionalFee,
        );
      }
    } catch (e) {
      this.logger.error(`Failed to process referral bonus for visit ${visitId}: ${e.message}`);
    }

    try {
      const amount = visit.amountDue || 500;
      const patientObj = visit.patientId || visit.patient;
      await this.financeService.generateInvoice({
        visitId: visit._id.toString(),
        patientId: patientObj ? patientObj._id.toString() : "unknown",
        therapistId: therapistId,
        amount: amount,
        serviceName: "Physiotherapy Session",
        date: visit.completedAt,
        patientName: patientObj ? patientObj.name || patientObj.firstName : "Patient",
      });
    } catch (e) {
      this.logger.error(`Failed to generate invoice for visit ${visitId}: ${e.message} `);
    }

    return visit;
  }

  async updateStatus(id: string, status: string) {
    const visit = await this.visitModel.findByIdAndUpdate(
      id,
      { status, visitStatus: status },
      { new: true },
    );
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);
    return visit;
  }

  async updatePaymentStatus(id: string, paymentDto: any) {
    const visit: any = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);

    visit.paymentStatus = paymentDto.paymentStatus || visit.paymentStatus;
    if (paymentDto.paymentTransactionId) {
      visit.paymentTransactionId = paymentDto.paymentTransactionId;
    }

    if (!visit.paymentAuditLog) visit.paymentAuditLog = [];
    visit.paymentAuditLog.push({
      timestamp: new Date(),
      action: "payment_status_updated",
      details: paymentDto.details || `Status changed to ${paymentDto.paymentStatus} `,
    });

    await visit.save();
    return visit;
  }

  async markArrived(id: string) {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);
    visit.status = "Arrived";
    visit.visitStatus = "Arrived";
    await visit.save();
    return visit;
  }

  async startTreatment(id: string) {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);
    visit.status = "Treatment Started";
    visit.visitStatus = "in_progress";
    visit.startTime = new Date();
    await visit.save();
    return visit;
  }

  async submitTreatmentForm(id: string, formType: 'Assessment' | 'Follow-up', formData: any) {
    const visit = await this.visitModel.findById(id).populate('treatment');
    if (!visit) throw new NotFoundException(`Visit #${id} not found`);

    visit.status = "Completed";
    visit.visitStatus = "completed";
    visit.completedAt = new Date();
    visit.notes = `${formType} submitted.${Object.keys(formData).slice(0, 3).map(k => `${k}: ${formData[k]}`).join(', ')} `;
    await visit.save();

    this.eventEmitter.emit("treatment.form_submitted", {
      treatmentId: visit.treatment,
      formType,
      formData,
      appointmentId: visit._id
    });

    return { visit, formType, formData };
  }
}
