import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel("Visit") private visitModel: Model<any>,
    @InjectModel("Appointment") private appointmentModel: Model<any>,
    @InjectModel("Invoice") private invoiceModel: Model<any>,
    @InjectModel("Patient") private patientModel: Model<any>,
    @InjectModel("Therapist") private therapistModel: Model<any>,
  ) { }

  async startVisit(appointmentId: string, therapistId: string) {
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    const visit = await this.visitModel.create({
      appointmentId: new Types.ObjectId(appointmentId),
      therapistId: new Types.ObjectId(therapistId),
      patientId: appointment.patientId,
      visitType: appointment.type || "home-visit",
      startTime: new Date(),
      status: "in-progress",
      charges: this.getChargesByType(appointment.type),
    });

    return {
      visitId: visit._id,
      status: "in-progress",
      startTime: visit.startTime,
    };
  }

  async completeVisit(
    visitId: string,
    completeDto: {
      treatmentNotes: string;
      exercisesPrescribed: string[];
      nextVisitDate?: Date;
    },
  ) {
    const visit = await this.visitModel.findById(visitId);

    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    // Calculate duration
    visit.endTime = new Date();
    visit.durationMinutes = Math.round(
      (visit.endTime.getTime() - visit.startTime.getTime()) / (1000 * 60),
    );

    // Update visit details
    visit.treatmentNotes = completeDto.treatmentNotes;
    visit.exercisesPrescribed = completeDto.exercisesPrescribed || [];
    visit.nextVisitDate = completeDto.nextVisitDate;
    visit.status = "completed";
    visit.completedAt = new Date();

    await visit.save();

    // Auto-generate invoice
    const invoice = await this.invoiceModel.create({
      invoiceNumber: `INV-${Date.now()}`,
      therapistId: visit.therapistId,
      patientId: visit.patientId,
      visitId: visit._id,
      amount: visit.charges,
      taxAmount: Math.round(visit.charges * 0.18), // 18% GST
      status: "pending",
      issuedDate: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      month: new Date().toISOString().slice(0, 7),
    });

    visit.invoiceId = invoice._id;
    await visit.save();

    // Get patient for notification
    const patient = await this.patientModel.findById(visit.patientId);

    return {
      visitId: visit._id,
      invoiceId: invoice._id,
      status: "completed",
      completedAt: visit.completedAt,
      charges: visit.charges,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        tax: invoice.taxAmount,
        total: invoice.amount + invoice.taxAmount,
      },
      patientPhone: patient?.phone,
    };
  }

  async getTherapistVisits(therapistId: string, month?: string) {
    const query: any = {
      therapistId: new Types.ObjectId(therapistId),
    };

    if (month) {
      const startDate = new Date(month + "-01");
      const endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0,
      );
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const visits = await this.visitModel
      .find(query)
      .populate("patientId", "name phone")
      .sort({ createdAt: -1 });

    return visits;
  }

  async getVisitById(visitId: string) {
    const visit = await this.visitModel
      .findById(visitId)
      .populate("patientId")
      .populate("therapistId")
      .populate("appointmentId");

    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    return visit;
  }

  async getAllVisits(filters: any = {}) {
    const query: any = {};
    if (filters.clinicId) {
      query.clinicId = new Types.ObjectId(filters.clinicId);
    }
    if (filters.patientId) query.patientId = new Types.ObjectId(filters.patientId);
    if (filters.therapistId) query.therapistId = new Types.ObjectId(filters.therapistId);
    if (filters.status) query.status = filters.status;

    return this.visitModel
      .find(query)
      .populate("patientId")
      .populate("therapistId")
      .populate("appointmentId")
      .sort({ createdAt: -1 });
  }

  private getChargesByType(type: string): number {
    const charges: { [key: string]: number } = {
      "home-visit": 1500,
      clinic: 1200,
      online: 1000,
    };
    return charges[type] || 1000;
  }

  async saveAssessment(dto: any) {
    const visit = await this.visitModel.create({
      patientId: new Types.ObjectId(dto.patientId),
      therapistId: new Types.ObjectId(dto.therapistId),
      clinicId: dto.clinicId ? new Types.ObjectId(dto.clinicId) : undefined,
      visitType: "clinic",
      startTime: new Date(),
      status: "completed",
      charges: 0,
      assessment: {
        chiefComplaint: dto.chiefComplaint,
        diagnosis: dto.diagnosis,
        treatmentPlan: dto.treatmentPlan,
        painScale: dto.painScale,
        rangeOfMotion: dto.rangeOfMotion,
        followupNotes: dto.followupNotes,
      },
      treatmentNotes: dto.followupNotes,
      completedAt: new Date()
    });

    return visit;
  }
}
