import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IntelligenceService } from './services/intelligence.service';
import { IntelligenceController } from './controllers/intelligence.controller';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { Visit, VisitSchema } from '../appointments/schemas/visit.schema';
import {
    TherapistLocationLog, TherapistLocationLogSchema,
    VisitIntegrityLog, VisitIntegrityLogSchema,
    LeakageFlag, LeakageFlagSchema
} from './schemas/intelligence.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Patient.name, schema: PatientSchema },
            { name: Visit.name, schema: VisitSchema },
            { name: TherapistLocationLog.name, schema: TherapistLocationLogSchema },
            { name: VisitIntegrityLog.name, schema: VisitIntegrityLogSchema },
            { name: LeakageFlag.name, schema: LeakageFlagSchema },
        ])
    ],
    controllers: [IntelligenceController],
    providers: [IntelligenceService],
    exports: [IntelligenceService]
})
export class IntelligenceModule { }
