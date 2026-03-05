import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PatientsService } from "./patients.service";
import { PatientsController } from "./patients.controller";
import { Patient, PatientSchema } from "./schemas/patient.schema";

// Patient schema is registered on the default AriesXpert database connection.
// Services use standard @InjectModel(Patient.name) to access it.

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule { }
