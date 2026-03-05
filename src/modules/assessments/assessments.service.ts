import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment, AssessmentDocument } from './schemas/assessment.schema';
import { FollowUp, FollowUpDocument } from './schemas/followup.schema';

@Injectable()
export class AssessmentsService {
    constructor(
        @InjectModel(Assessment.name) private assessmentModel: Model<AssessmentDocument>,
        @InjectModel(FollowUp.name) private followupModel: Model<FollowUpDocument>,
    ) { }

    async createInitial(dto: any, clinicId: string, userId: string) {
        const assessment = new this.assessmentModel({
            ...dto,
            clinicId: new Types.ObjectId(clinicId),
            assessedBy: new Types.ObjectId(userId),
            patientId: new Types.ObjectId(dto.patientId),
            templateId: new Types.ObjectId(dto.templateId)
        });
        return assessment.save();
    }

    async createFollowUp(dto: any, clinicId: string, userId: string) {
        const followup = new this.followupModel({
            ...dto,
            clinicId: new Types.ObjectId(clinicId),
            performedBy: new Types.ObjectId(userId),
            patientId: new Types.ObjectId(dto.patientId),
            assessmentId: new Types.ObjectId(dto.assessmentId),
            templateId: new Types.ObjectId(dto.templateId)
        });
        return followup.save();
    }

    async findByPatient(patientId: string, clinicId: string) {
        const assessments = await this.assessmentModel.find({
            patientId: new Types.ObjectId(patientId),
            clinicId: new Types.ObjectId(clinicId)
        }).populate('assessedBy', 'firstName lastName').populate('templateId', 'name').exec();

        const followups = await this.followupModel.find({
            patientId: new Types.ObjectId(patientId),
            clinicId: new Types.ObjectId(clinicId)
        }).populate('performedBy', 'firstName lastName').populate('templateId', 'name').exec();

        return { assessments, followups };
    }

    async findInitialById(id: string, clinicId: string) {
        const assessment = await this.assessmentModel.findOne({
            _id: new Types.ObjectId(id),
            clinicId: new Types.ObjectId(clinicId)
        }).exec();
        if (!assessment) throw new NotFoundException('Assessment not found');
        return assessment;
    }
}
