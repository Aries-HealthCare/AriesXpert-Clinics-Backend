import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { AssessmentTemplatesService } from './assessment-templates.service';
import { AssessmentTemplatesController } from './assessment-templates.controller';
import { Assessment, AssessmentSchema } from './schemas/assessment.schema';
import { AssessmentTemplate, AssessmentTemplateSchema } from './schemas/assessment-template.schema';
import { FollowUp, FollowUpSchema } from './schemas/followup.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Assessment.name, schema: AssessmentSchema },
            { name: AssessmentTemplate.name, schema: AssessmentTemplateSchema },
            { name: FollowUp.name, schema: FollowUpSchema },
        ]),
    ],
    controllers: [AssessmentsController, AssessmentTemplatesController],
    providers: [AssessmentsService, AssessmentTemplatesService],
    exports: [AssessmentsService, AssessmentTemplatesService],
})
export class AssessmentsModule { }
