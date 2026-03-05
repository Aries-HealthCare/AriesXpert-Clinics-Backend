import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Patient, PatientSchema } from "../patients/schemas/patient.schema";
import {
  Therapist,
  TherapistSchema,
} from "../therapists/schemas/therapist.schema";
import { Visit, VisitSchema } from "../appointments/schemas/visit.schema";
import { Invoice, InvoiceSchema } from "../invoices/schemas/invoice.schema";
import { Lead, LeadSchema } from "../leads/schemas/lead.schema";
import { Clinic, ClinicSchema } from "../clinics/schemas/clinic.schema";
import {
  Franchise,
  FranchiseSchema,
} from "../franchises/schemas/franchise.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Therapist.name, schema: TherapistSchema },
      { name: Visit.name, schema: VisitSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Franchise.name, schema: FranchiseSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule { }
