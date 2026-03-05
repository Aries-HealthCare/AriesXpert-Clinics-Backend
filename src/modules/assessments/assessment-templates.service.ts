import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentTemplate, AssessmentTemplateDocument } from './schemas/assessment-template.schema';

@Injectable()
export class AssessmentTemplatesService {
    constructor(
        @InjectModel(AssessmentTemplate.name) private templateModel: Model<AssessmentTemplateDocument>,
    ) { }

    async create(createDto: any, clinicId: string) {
        const template = new this.templateModel({
            ...createDto,
            clinicId: new Types.ObjectId(clinicId),
        });
        return template.save();
    }

    async findAll(clinicId: string) {
        // Return both global templates (no clinicId) and clinic-specific templates
        return this.templateModel.find({
            $or: [
                { clinicId: new Types.ObjectId(clinicId) },
                { clinicId: { $exists: false } },
                { clinicId: null }
            ],
            isActive: true
        }).exec();
    }

    async findOne(id: string) {
        const template = await this.templateModel.findById(id).exec();
        if (!template) throw new NotFoundException('Template not found');
        return template;
    }

    async update(id: string, updateDto: any) {
        return this.templateModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    }
}
