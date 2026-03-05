import { Module } from "@nestjs/common";
import { AutomationService } from "./automation.service";
import { AutomationController } from "./automation.controller";
import { LeadsModule } from "../leads/leads.module";
import { TherapistsModule } from "../therapists/therapists.module";
import { CommunicationModule } from "../communication/communication.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { PatientsModule } from "../patients/patients.module";

@Module({
  imports: [
    LeadsModule,
    TherapistsModule,
    CommunicationModule,
    AppointmentsModule,
    PatientsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
