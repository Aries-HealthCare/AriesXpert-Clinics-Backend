import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Patient, PatientDocument } from "../patients/schemas/patient.schema";
import { Treatment, TreatmentDocument } from "./schemas/treatment.schema";
import { Visit, VisitDocument } from "../appointments/schemas/visit.schema";
import { WhatsAppEventService, WhatsAppEventType } from "../whatsapp/services/whatsapp-event.service";
import { Clinic } from "../clinics/schemas/clinic.schema";
import { Package } from "../packages/schemas/package.schema";
import { Therapist } from "../therapists/schemas/therapist.schema";
import { LegacyTherapist } from "../therapists/schemas/legacy-therapist.schema";

@Injectable()
export class TreatmentAutomationService {
    private readonly logger = new Logger(TreatmentAutomationService.name);

    constructor(
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
        @InjectModel(Treatment.name) private treatmentModel: Model<TreatmentDocument>,
        @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
        @InjectModel("Clinic") private clinicModel: Model<any>,
        @InjectModel(Package.name) private packageModel: Model<any>,
        @InjectModel(Therapist.name) private therapistModel: Model<any>,
        @InjectModel(LegacyTherapist.name) private legacyTherapistModel: Model<any>,
        private whatsappEventService: WhatsAppEventService,
    ) { }

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Lead Conversion → Patient + Treatment + Appointment
    // ─────────────────────────────────────────────────────────────
    @OnEvent("lead.converted")
    async handleLeadConverted(payload: { lead: any, clinicId: string }) {
        const { lead, clinicId } = payload;
        this.logger.log(`Handling lead conversion for: ${lead.name}`);

        try {
            // 1. Create Patient
            const patient = await this.patientModel.create({
                firstName: lead.name.split(" ")[0],
                lastName: lead.name.split(" ").slice(1).join(" ") || " ",
                phone: lead.phone,
                email: lead.email,
                gender: lead.gender || "Other",
                age: lead.age,
                address: lead.address,
                leadSource: lead.source || "Lead Module",
                clinicId: new Types.ObjectId(clinicId),
                status: "Active",
            });

            // 2. Create Treatment
            const treatment = await this.treatmentModel.create({
                treatmentName: lead.condition || "Physiotherapy Treatment",
                patient: patient._id,
                expert: lead.assignedTo,
                clinicId: new Types.ObjectId(clinicId),
                startDate: new Date(),
                preferenceTime: lead.preferredTime || "10:00 AM",
                status: "Active",
                treatmentTypeNew: "New Treatment",
                sessionNumber: 1,
                totalSessions: 0,
                completedSessions: 0,
                paymentType: "Regular",
                paymentStatus: "Pending",
            });

            // 3. Create First Appointment (Session 1)
            const appointmentDate = lead.preferredDate ? new Date(lead.preferredDate) : new Date();
            const appointment = await this.visitModel.create({
                patient: patient._id,
                treatment: treatment._id,
                expert: lead.assignedTo,
                clinicId: new Types.ObjectId(clinicId),
                visitDate: appointmentDate,
                appointmentDate: appointmentDate,
                appointmentTime: lead.preferredTime || "10:00 AM",
                status: "Scheduled",
                sessionNumber: 1,
            });

            // 4. Fetch Clinic Name for WhatsApp
            const clinic = await this.clinicModel.findById(clinicId);
            const clinicName = clinic?.name || "Aries HealthCare";
            const appointmentDateStr = appointmentDate.toLocaleDateString("en-IN");
            const appointmentTime = lead.preferredTime || "10:00 AM";

            // ── STEP 2: WhatsApp to Patient ──
            if (patient.phone) {
                await this.whatsappEventService.emitWhatsAppEvent({
                    type: WhatsAppEventType.APPOINTMENT_SCHEDULED,
                    phoneNumber: patient.phone,
                    templateName: "appointment_booked_patient",
                    variables: {
                        patientName: patient.firstName,
                        clinicName,
                        date: appointmentDateStr,
                        time: appointmentTime,
                    },
                    patientId: patient._id.toString(),
                    appointmentId: appointment._id.toString(),
                });
                this.logger.log(`WhatsApp sent to patient: ${patient.phone}`);
            }

            // ── STEP 2: WhatsApp to Therapist ──
            if (lead.assignedTo) {
                const therapistPhone = await this.getTherapistPhone(lead.assignedTo.toString());
                if (therapistPhone) {
                    await this.whatsappEventService.emitWhatsAppEvent({
                        type: WhatsAppEventType.APPOINTMENT_SCHEDULED,
                        phoneNumber: therapistPhone,
                        templateName: "appointment_booked_therapist",
                        variables: {
                            patientName: lead.name,
                            time: appointmentTime,
                            clinicName,
                            date: appointmentDateStr,
                        },
                        appointmentId: appointment._id.toString(),
                    });
                    this.logger.log(`WhatsApp sent to therapist: ${therapistPhone}`);
                }
            }

            this.logger.log(`Lead conversion complete: Patient ${patient._id}, Treatment ${treatment._id}, Appointment ${appointment._id}`);

        } catch (error) {
            this.logger.error("Error in lead conversion automation:", error);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // NEW: Part 6 — PACKAGE TREATMENT SPECIAL LOGIC
    // ─────────────────────────────────────────────────────────────
    @OnEvent("treatment.created")
    async handleTreatmentCreated(treatment: any) {
        this.logger.log(`New treatment created: ${treatment._id || treatment.id} [${treatment.paymentType}]`);

        // If Treatment Type: PACKAGE, System must auto create future appointments
        if (treatment.paymentType === "Package" && (treatment.assignedPackage || treatment.packageId)) {
            try {
                const pkgId = treatment.assignedPackage || treatment.packageId;
                const pkg = await this.packageModel.findById(pkgId);
                const sessionsTotal = pkg?.numberOfSessions || pkg?.sessions || 10;

                // Update treatment with correct session counts
                await this.treatmentModel.findByIdAndUpdate(treatment.id || treatment._id, {
                    totalSessions: sessionsTotal,
                    remainingSessions: sessionsTotal
                });

                // Auto create those sessions (weekly starting from startDate)
                const start = new Date(treatment.startDate || new Date());
                const patientId = treatment.patient?.id || treatment.patient;
                const expertId = treatment.expert?.id || treatment.expert;
                const clinicId = treatment.clinicId;

                for (let i = 1; i <= sessionsTotal; i++) {
                    const sessionDate = new Date(start);
                    sessionDate.setDate(start.getDate() + ((i - 1) * 7));

                    await this.visitModel.create({
                        patient: new Types.ObjectId(patientId),
                        treatment: new Types.ObjectId(treatment.id || treatment._id),
                        expert: new Types.ObjectId(expertId),
                        clinicId: new Types.ObjectId(clinicId),
                        visitDate: sessionDate,
                        appointmentDate: sessionDate,
                        appointmentTime: treatment.preferenceTime || "10:00 AM",
                        status: "Scheduled",
                        sessionNumber: i,
                        isPackageSession: true
                    });
                }
                this.logger.log(`Created ${sessionsTotal} package sessions for treatment ${treatment.id}`);
            } catch (err) {
                this.logger.error(`Error in package auto-scheduling: ${err.message}`);
            }
        }
    }


    // ─────────────────────────────────────────────────────────────
    // Helper: Get therapist phone (checks both Therapist & Legacy collections)
    // ─────────────────────────────────────────────────────────────
    private async getTherapistPhone(therapistId: string): Promise<string | null> {
        try {
            const therapist = await this.therapistModel.findById(therapistId).select("phone");
            if (therapist?.phone) return therapist.phone;

            const legacyTherapist = await this.legacyTherapistModel.findById(therapistId).select("phone");
            if (legacyTherapist?.phone) return legacyTherapist.phone;
        } catch (e) {
            this.logger.warn(`Could not fetch therapist phone for ${therapistId}: ${e.message}`);
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Treatment form submitted → Update sessions & records
    // ─────────────────────────────────────────────────────────────
    @OnEvent("treatment.form_submitted")
    async handleFormSubmitted(payload: {
        treatmentId: string;
        formType: "Assessment" | "Follow-up";
        formData: any;
        appointmentId: string;
    }) {
        const { treatmentId, formType, formData, appointmentId } = payload;
        this.logger.log(`Form submitted for treatment ${treatmentId}: ${formType}`);

        try {
            const treatment = await this.treatmentModel.findById(treatmentId);
            if (!treatment) {
                this.logger.warn(`Treatment not found: ${treatmentId}`);
                return;
            }

            treatment.completedSessions += 1;
            treatment.remainingSessions = Math.max(
                0,
                treatment.totalSessions - treatment.completedSessions,
            );

            const sessionRecord = {
                appointmentId,
                date: new Date(),
                formType,
                summary: formData,
            };

            treatment.sessionHistory.push(sessionRecord);

            if (formType === "Assessment") {
                treatment.assessmentRecords.push(sessionRecord);
            } else {
                treatment.followUpRecords.push(sessionRecord);
            }

            // Auto-complete treatment when all sessions done
            if (treatment.totalSessions > 0 && treatment.remainingSessions === 0) {
                treatment.status = "Completed";
                this.logger.log(`Treatment ${treatmentId} automatically marked as Completed`);
            }

            await treatment.save();
        } catch (error) {
            this.logger.error("Error updating treatment after form submission:", error);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 10: Package purchased → Update Treatment + Auto-create future appointments
    // ─────────────────────────────────────────────────────────────
    @OnEvent("package.purchased")
    async handlePackagePurchased(payload: {
        treatmentId: string;
        packageId: string;
        patientId: string;
        paymentMode: string;
        amount: number;
    }) {
        const { treatmentId, packageId, patientId } = payload;
        this.logger.log(`Package purchased for treatment ${treatmentId}: pkg=${packageId}`);

        try {
            // 1. Fetch Package details
            const pkg = await this.packageModel.findById(packageId);
            if (!pkg) {
                this.logger.warn(`Package not found: ${packageId}`);
                return;
            }

            const sessionsToCreate = pkg.numberOfSessions || pkg.sessions || 10;

            // 2. Update Treatment with package details
            const treatment = await this.treatmentModel.findById(treatmentId);
            if (!treatment) {
                this.logger.warn(`Treatment not found: ${treatmentId}`);
                return;
            }

            treatment.totalSessions = sessionsToCreate;
            treatment.remainingSessions = Math.max(0, sessionsToCreate - treatment.completedSessions);
            treatment.paymentType = "Package";
            treatment.paymentStatus = "Paid";
            treatment.assignedPackage = new Types.ObjectId(packageId);
            await treatment.save();

            const clinicId = treatment.clinicId;
            const expertId = treatment.expert;

            // 3. Auto-create Future Appointments (weekly, starting from next week)
            const remainingToCreate = sessionsToCreate - treatment.completedSessions;
            for (let i = 1; i <= remainingToCreate; i++) {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + (i * 7)); // One per week

                await this.visitModel.create({
                    patient: new Types.ObjectId(patientId),
                    treatment: new Types.ObjectId(treatmentId),
                    expert: expertId,
                    clinicId,
                    visitDate: futureDate,
                    appointmentDate: futureDate,
                    appointmentTime: "10:00 AM",
                    status: "Scheduled",
                    sessionNumber: treatment.completedSessions + i,
                    isPackageSession: true,
                });
            }

            // 4. Send WhatsApp confirmation to patient
            const patient = await this.patientModel.findById(patientId);
            if (patient?.phone) {
                const clinic = await this.clinicModel.findById(clinicId.toString());
                const clinicName = clinic?.name || "Aries HealthCare";
                await this.whatsappEventService.emitWhatsAppEvent({
                    type: WhatsAppEventType.PACKAGE_PURCHASED,
                    phoneNumber: patient.phone,
                    templateName: "package_purchased_confirmation",
                    variables: {
                        patientName: patient.firstName,
                        packageName: pkg.name || `${sessionsToCreate} Session Package`,
                        totalSessions: sessionsToCreate.toString(),
                        clinicName,
                    },
                    patientId: patientId,
                });
                this.logger.log(`Package purchase WhatsApp sent to patient: ${patient.phone}`);
            }

            this.logger.log(`Auto-created ${remainingToCreate} future appointments for package.`);

        } catch (error) {
            this.logger.error("Error in package purchase automation:", error);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: arrival event hook (for future extensibility)
    // ─────────────────────────────────────────────────────────────
    @OnEvent("appointment.arrived")
    async handleAppointmentArrived(payload: { appointmentId: string }) {
        this.logger.log(`Appointment marked as arrived: ${payload.appointmentId}`);
    }
}
