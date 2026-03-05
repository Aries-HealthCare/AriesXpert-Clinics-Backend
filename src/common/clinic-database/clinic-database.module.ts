import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// Import all clinic-related schemas
import { Clinic, ClinicSchema } from "../../modules/clinics/schemas/clinic.schema";
import { ClinicUser, ClinicUserSchema } from "../../modules/clinics/schemas/clinic-user.schema";
import { Patient, PatientSchema } from "../../modules/patients/schemas/patient.schema";
import { Visit, VisitSchema } from "../../modules/appointments/schemas/visit.schema";
import { Treatment, TreatmentSchema } from "../../modules/treatments/schemas/treatment.schema";
import { Package, PackageSchema } from "../../modules/packages/schemas/package.schema";
import { Attendance, AttendanceSchema } from "../../modules/attendance/schemas/attendance.schema";
import { Salary, SalarySchema } from "../../modules/payroll/schemas/salary.schema";
import { Payroll, PayrollSchema } from "../../modules/payroll/schemas/payroll.schema";
import { Lead, LeadSchema } from "../../modules/leads/schemas/lead.schema";
import { Assessment, AssessmentSchema } from "../../modules/assessments/schemas/assessment.schema";
import { AssessmentTemplate, AssessmentTemplateSchema } from "../../modules/assessments/schemas/assessment-template.schema";
import { FollowUp, FollowUpSchema } from "../../modules/assessments/schemas/followup.schema";
import { Role, RoleSchema } from "../../modules/roles/schemas/role.schema";
import { RolePermission, RolePermissionSchema } from "../../modules/roles/schemas/role-permission.schema";
import { Invoice, InvoiceSchema } from "../../modules/finance/schemas/invoice.schema";
import { Ledger, LedgerSchema } from "../../modules/finance/schemas/ledger.schema";
import { ClinicAccount, ClinicAccountSchema } from "../../modules/finance/schemas/clinic-account.schema";
import { Payment, PaymentSchema } from "../../modules/payments/schemas/payment.schema";
import { PaymentTransaction, PaymentTransactionSchema } from "../../modules/payments/schemas/payment-transaction.schema";
import { TreatmentType, TreatmentTypeSchema } from "../../modules/treatment-types/schemas/treatment-type.schema";
import { BroadcastListing, BroadcastListingSchema } from "../../modules/broadcasts/schemas/broadcast-listing.schema";
import { Broadcast, BroadcastSchema } from "../../modules/broadcasts/schemas/broadcast.schema";

/**
 * ClinicDatabaseModule - Centralizes all clinic-related schemas on the 'clinic' database connection
 * 
 * This module ensures proper database separation:
 * - All clinic-related data goes to the 'clinic' database
 * - Global/admin data stays in the 'ariesxpert' database
 * - Registry data stays in the 'clinics' database
 * 
 * Collections in the 'clinic' database:
 * - clinics: Clinic profiles
 * - clinic_users: Clinic staff and users
 * - patients: Patient records
 * - appointments: Visit/appointment records
 * - treatments: Treatment records
 * - packages: Package definitions
 * - attendances: Staff attendance records
 * - salaries: Salary records
 * - leads: Lead records
 * - assessments: Assessment records
 * - assessment_templates: Assessment form templates
 * - followups: Follow-up records
 * - roles: Role definitions
 * - role_permissions: Role permission mappings
 * - invoices: Invoice records
 * - ledgers: Financial ledger records
 * - clinic_accounts: Clinic financial accounts
 * - payments: Payment records
 * - payment_transactions: Payment transaction records
 * - treatment_types: Treatment type definitions
 * - broadcast_listings: Broadcast listing records
 * - broadcasts: Broadcast records for clinic communications
 */
@Global()
@Module({
    imports: [
        MongooseModule.forFeature(
            [
                // Core Clinic Collections
                { name: Clinic.name, schema: ClinicSchema, collection: 'clinics' },
                { name: ClinicUser.name, schema: ClinicUserSchema, collection: 'clinic_users' },

                // Patient Management
                { name: Patient.name, schema: PatientSchema, collection: 'patients' },

                // Appointments & Visits
                { name: Visit.name, schema: VisitSchema, collection: 'appointments' },

                // Treatments
                { name: Treatment.name, schema: TreatmentSchema, collection: 'treatments' },
                { name: TreatmentType.name, schema: TreatmentTypeSchema, collection: 'treatment_types' },

                // Packages
                { name: Package.name, schema: PackageSchema, collection: 'packages' },

                // HR & Payroll
                { name: Attendance.name, schema: AttendanceSchema, collection: 'attendances' },
                { name: Salary.name, schema: SalarySchema, collection: 'salaries' },
                { name: Payroll.name, schema: PayrollSchema, collection: 'payrolls' },

                // Leads
                { name: Lead.name, schema: LeadSchema, collection: 'leads' },

                // Assessments
                { name: Assessment.name, schema: AssessmentSchema, collection: 'assessments' },
                { name: AssessmentTemplate.name, schema: AssessmentTemplateSchema, collection: 'assessment_templates' },
                { name: FollowUp.name, schema: FollowUpSchema, collection: 'followups' },

                // Roles & Permissions
                { name: Role.name, schema: RoleSchema, collection: 'roles' },
                { name: RolePermission.name, schema: RolePermissionSchema, collection: 'role_permissions' },

                // Finance
                { name: Invoice.name, schema: InvoiceSchema, collection: 'invoices' },
                { name: Ledger.name, schema: LedgerSchema, collection: 'ledgers' },
                { name: ClinicAccount.name, schema: ClinicAccountSchema, collection: 'clinic_accounts' },

                // Payments
                { name: Payment.name, schema: PaymentSchema, collection: 'payments' },
                { name: PaymentTransaction.name, schema: PaymentTransactionSchema, collection: 'payment_transactions' },

                // Broadcasts
                { name: BroadcastListing.name, schema: BroadcastListingSchema, collection: 'broadcast_listings' },
                { name: Broadcast.name, schema: BroadcastSchema, collection: 'broadcasts' },
            ]
            // Removed 'clinic' connection to use default (Main DB)
        ),
    ],
    exports: [MongooseModule],
})
export class ClinicDatabaseModule { }
