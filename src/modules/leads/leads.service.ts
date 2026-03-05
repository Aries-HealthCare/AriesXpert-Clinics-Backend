import { Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Lead, LeadDocument } from "./schemas/lead.schema";
import { ReferralsService } from "../referrals/referrals.service";
import { ReferralType } from "../referrals/schemas/referral.schema";

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => ReferralsService))
    private referralsService: ReferralsService,
  ) { }

  async createPublicLead(createLeadDto: any) {
    const {
      fullName,
      phone,
      email,
      country,
      state,
      city,
      area,
      service,
      date,
      time,
      address,
      condition,
      notes,
      leadType,
      companyName,
      contactPerson,
      investorName,
      message,
    } = createLeadDto;

    const leadData = {
      name:
        fullName || contactPerson || investorName || companyName || "Unknown",
      phone,
      email,
      country,
      state,
      city,
      area,
      address,
      serviceRequired: service,
      preferredDate: date,
      preferredTime: time,
      notes: message || notes,
      condition,
      requirements: message,
      leadType: leadType || "general",
      source: "Website",
      status: "New",
      referralCodeUsed: createLeadDto.referralCode || "",
    };

    if (createLeadDto.referralCode) {
      try {
        const referralStats = await this.referralsService.getTherapistReferralStatsByCode(createLeadDto.referralCode);
        if (referralStats.therapistId) {
          leadData['referredBy'] = referralStats.therapistId;
        }
      } catch (e) { }
    }

    // Public leads from website go to Main Command Center database
    return this.leadModel.create(leadData);
  }

  async findAll(query: any, userClinicId?: string) {
    const { status, city, source, assignedTo, page = 1, limit = 10, clinicId } = query;
    const filter: any = {};

    const rawClinicId = (userClinicId || clinicId || '').toString().trim();
    if (rawClinicId && rawClinicId !== 'null' && rawClinicId !== 'undefined') {
      try {
        filter.clinicId = new Types.ObjectId(rawClinicId);
      } catch (e) {
        filter.clinicId = rawClinicId;
      }
    }

    if (status) filter.status = status;
    if (city) filter.city = city;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;

    const leads = await this.leadModel
      .find(filter)
      .populate("assignedTo", "firstName lastName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    const count = await this.leadModel.countDocuments(filter);

    return {
      leads,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findOne(id: string) {
    const lead = await this.leadModel
      .findById(id)
      .populate("assignedTo", "firstName lastName")
      .exec();
    if (!lead) throw new NotFoundException(`Lead #${id} not found`);
    return lead;
  }

  async create(createLeadDto: any) {
    const lead = await this.leadModel.create(createLeadDto);
    if (["CONFIRMED", "APPOINTMENT BOOKED"].includes(lead.status?.toUpperCase())) {
      this.eventEmitter.emit("lead.converted", { lead, clinicId: lead.clinicId });
    }
    return lead;
  }

  async update(id: string, updateLeadDto: any) {
    const lead = await this.leadModel
      .findByIdAndUpdate(id, updateLeadDto, { new: true })
      .exec();
    if (!lead) throw new NotFoundException(`Lead #${id} not found`);

    if (["CONFIRMED", "APPOINTMENT BOOKED"].includes(lead.status?.toUpperCase())) {
      this.eventEmitter.emit("lead.converted", { lead, clinicId: lead.clinicId });
    }

    return lead;
  }

  async assignTherapist(id: string, therapistId: string) {
    return this.leadModel
      .findByIdAndUpdate(
        id,
        { assignedTo: therapistId, status: "Assigned" },
        { new: true },
      )
      .exec();
  }

  async remove(id: string) {
    const lead = await this.leadModel.findByIdAndDelete(id).exec();
    if (!lead) throw new NotFoundException(`Lead #${id} not found`);
    return lead;
  }
}
