import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, Request, Logger, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

/**
 * ClinicDataController
 * Handles ALL clinic-specific data endpoints using the correct isolated collections:
 *  - clinic_patients  (NOT the HQ 'patients' collection)
 *  - clinic_appointments (NOT the HQ 'visits' collection)
 *  - clinic_invoices  (NOT the HQ 'invoices' collection)
 *  - clinic_treatments (NOT the HQ 'treatments' collection)
 *
 * This controller enforces strict data separation between
 * System 1 (HQ Command Centre) and System 2 (Clinic Module).
 *
 * Route Prefix: /clinics/:clinicId/*
 */
@Controller('clinics')
@UseGuards(AuthGuard('jwt'))
export class ClinicDataController {
    private readonly logger = new Logger(ClinicDataController.name);

    constructor(
        @InjectConnection() private readonly db: Connection,
    ) { }

    private toId(id: string): Types.ObjectId {
        try {
            return new Types.ObjectId(id);
        } catch {
            throw new BadRequestException(`Invalid ID format: ${id}`);
        }
    }

    private clinicFilter(clinicId: string) {
        const id = this.toId(clinicId);
        return { clinicId: { $in: [id, clinicId] }, isDeleted: { $ne: true } };
    }

    private async autoSequence(collection: string, clinicId: string, prefix: string): Promise<string> {
        const count = await this.db.collection(collection).countDocuments({ clinicId: this.toId(clinicId) });
        return `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATIENTS — clinic_patients collection (ISOLATED from HQ patients)
    // ══════════════════════════════════════════════════════════════════════════

    @Get(':clinicId/patients')
    async getPatients(
        @Param('clinicId') clinicId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
        @Query('search') search?: string,
        @Query('status') status?: string,
    ) {
        const filter: any = this.clinicFilter(clinicId);
        if (status && status !== 'all') filter.status = status;
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { patientCode: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [patients, total] = await Promise.all([
            this.db.collection('clinic_patients')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .toArray(),
            this.db.collection('clinic_patients').countDocuments(filter),
        ]);

        return { patients, total, page: Number(page), limit: Number(limit) };
    }

    @Post(':clinicId/patients')
    async createPatient(@Param('clinicId') clinicId: string, @Body() body: any, @Request() req: any) {
        if (!body.firstName || !body.phone) {
            throw new BadRequestException('firstName and phone are required');
        }

        // Check duplicate (same phone in same clinic)
        const existing = await this.db.collection('clinic_patients').findOne({
            clinicId: this.toId(clinicId),
            phone: body.phone,
            isDeleted: { $ne: true },
        });
        if (existing) {
            throw new BadRequestException(`Patient with phone ${body.phone} already exists in this clinic`);
        }

        const patientCode = await this.autoSequence('clinic_patients', clinicId, 'CP');
        const doc = {
            clinicId: this.toId(clinicId),
            patientCode,
            firstName: body.firstName.trim(),
            lastName: body.lastName?.trim() || '',
            phone: body.phone,
            email: body.email?.toLowerCase().trim(),
            gender: body.gender,
            dob: body.dob ? new Date(body.dob) : undefined,
            age: body.age ? Number(body.age) : undefined,
            bloodGroup: body.bloodGroup,
            address: body.address || {},
            emergencyContact: body.emergencyContact || {},
            medicalHistory: body.medicalHistory || {},
            currentDiagnosis: body.currentDiagnosis,
            referredBy: body.referredBy,
            referralSource: body.referralSource || 'walkin',
            status: 'active',
            assignedDoctorId: body.assignedDoctorId ? this.toId(body.assignedDoctorId) : undefined,
            totalSessions: 0,
            totalBilled: 0,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.db.collection('clinic_patients').insertOne(doc);
        this.logger.log(`New clinic patient created: ${patientCode} in clinic ${clinicId}`);
        return { ...doc, _id: result.insertedId };
    }

    @Get(':clinicId/patients/:patientId')
    async getPatientDetail(@Param('clinicId') clinicId: string, @Param('patientId') patientId: string) {
        const patient = await this.db.collection('clinic_patients').findOne({
            _id: this.toId(patientId),
            clinicId: this.toId(clinicId),
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const [appointments, treatments, invoices] = await Promise.all([
            this.db.collection('clinic_appointments')
                .find({ patientId: this.toId(patientId), clinicId: this.toId(clinicId) })
                .sort({ scheduledDate: -1 }).limit(10).toArray(),
            this.db.collection('clinic_treatments')
                .find({ patientId: this.toId(patientId), clinicId: this.toId(clinicId) })
                .sort({ startDate: -1 }).limit(5).toArray(),
            this.db.collection('clinic_invoices')
                .find({ patientId: this.toId(patientId), clinicId: this.toId(clinicId) })
                .sort({ issueDate: -1 }).limit(10).toArray(),
        ]);

        return { ...patient, appointments, treatments, invoices };
    }

    @Put(':clinicId/patients/:patientId')
    async updatePatient(
        @Param('clinicId') clinicId: string,
        @Param('patientId') patientId: string,
        @Body() body: any,
    ) {
        const { _id, clinicId: _, patientCode, ...updates } = body;
        await this.db.collection('clinic_patients').updateOne(
            { _id: this.toId(patientId), clinicId: this.toId(clinicId) },
            { $set: { ...updates, updatedAt: new Date() } }
        );
        return { success: true };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPOINTMENTS — clinic_appointments (ISOLATED from HQ visits)
    // ══════════════════════════════════════════════════════════════════════════

    @Get(':clinicId/appointments')
    async getAppointments(
        @Param('clinicId') clinicId: string,
        @Query('date') date?: string,
        @Query('status') status?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
        @Query('assignedToId') assignedToId?: string,
    ) {
        const filter: any = this.clinicFilter(clinicId);
        if (status && status !== 'all') filter.status = status;
        if (assignedToId) filter.assignedToId = this.toId(assignedToId);

        if (date === 'today') {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
            filter.scheduledDate = { $gte: today, $lt: tomorrow };
        } else if (date) {
            const d = new Date(date); d.setHours(0, 0, 0, 0);
            const next = new Date(d); next.setDate(next.getDate() + 1);
            filter.scheduledDate = { $gte: d, $lt: next };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [appointments, total] = await Promise.all([
            this.db.collection('clinic_appointments')
                .find(filter)
                .sort({ scheduledDate: 1, scheduledTime: 1 })
                .skip(skip).limit(Number(limit)).toArray(),
            this.db.collection('clinic_appointments').countDocuments(filter),
        ]);

        return { appointments, total, page: Number(page), limit: Number(limit) };
    }

    @Post(':clinicId/appointments')
    async createAppointment(@Param('clinicId') clinicId: string, @Body() body: any, @Request() req: any) {
        if (!body.patientId || !body.scheduledDate) {
            throw new BadRequestException('patientId and scheduledDate are required');
        }

        // Verify patient belongs to this clinic
        const patient = await this.db.collection('clinic_patients').findOne({
            _id: this.toId(body.patientId),
            clinicId: this.toId(clinicId),
        });
        if (!patient) throw new NotFoundException('Patient not found in this clinic');

        const apptNumber = await this.autoSequence('clinic_appointments', clinicId, 'APT');
        const doc = {
            clinicId: this.toId(clinicId),
            appointmentNumber: apptNumber,
            patientId: this.toId(body.patientId),
            patientName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
            patientPhone: patient.phone,
            assignedToId: body.assignedToId ? this.toId(body.assignedToId) : undefined,
            assignedToName: body.assignedToName,
            appointmentType: body.appointmentType || 'first_consultation',
            visitMode: body.visitMode || 'in_clinic',
            scheduledDate: new Date(body.scheduledDate),
            scheduledTime: body.scheduledTime || '09:00',
            duration: Number(body.duration) || 30,
            chiefComplaint: body.chiefComplaint,
            status: 'scheduled',
            amount: Number(body.amount) || 0,
            paymentStatus: 'pending',
            paymentMethod: body.paymentMethod || 'cash',
            recordedBy: req.user?.id ? this.toId(req.user.id) : undefined,
            notes: body.notes,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.db.collection('clinic_appointments').insertOne(doc);

        // Update patient's lastVisitDate
        await this.db.collection('clinic_patients').updateOne(
            { _id: this.toId(body.patientId) },
            { $set: { lastVisitDate: new Date(body.scheduledDate) }, $inc: { totalSessions: 1 } }
        );

        this.logger.log(`Clinic appointment created: ${apptNumber} for clinic ${clinicId}`);
        return { ...doc, _id: result.insertedId };
    }

    @Patch(':clinicId/appointments/:apptId/status')
    async updateAppointmentStatus(
        @Param('clinicId') clinicId: string,
        @Param('apptId') apptId: string,
        @Body() body: any,
    ) {
        const validStatuses = ['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(body.status)) {
            throw new BadRequestException(`Invalid status: ${body.status}`);
        }
        await this.db.collection('clinic_appointments').updateOne(
            { _id: this.toId(apptId), clinicId: this.toId(clinicId) },
            {
                $set: {
                    status: body.status,
                    consultationNotes: body.consultationNotes,
                    diagnosis: body.diagnosis,
                    prescriptions: body.prescriptions,
                    cancellationReason: body.cancellationReason,
                    updatedAt: new Date(),
                }
            }
        );
        return { success: true };
    }

    @Get(':clinicId/appointments/stats')
    async getAppointmentStats(@Param('clinicId') clinicId: string) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const baseFilter = { clinicId: this.toId(clinicId), isDeleted: { $ne: true } };

        const [total, todayCount, scheduled, completed, cancelled] = await Promise.all([
            this.db.collection('clinic_appointments').countDocuments(baseFilter),
            this.db.collection('clinic_appointments').countDocuments({
                ...baseFilter, scheduledDate: { $gte: today, $lt: tomorrow }
            }),
            this.db.collection('clinic_appointments').countDocuments({ ...baseFilter, status: 'scheduled' }),
            this.db.collection('clinic_appointments').countDocuments({ ...baseFilter, status: 'completed' }),
            this.db.collection('clinic_appointments').countDocuments({ ...baseFilter, status: 'cancelled' }),
        ]);

        return { total, todayCount, scheduled, completed, cancelled };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INVOICES — clinic_invoices (ISOLATED from HQ invoices)
    // ══════════════════════════════════════════════════════════════════════════

    @Get(':clinicId/invoices')
    async getInvoices(
        @Param('clinicId') clinicId: string,
        @Query('status') status?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
    ) {
        const filter: any = this.clinicFilter(clinicId);
        if (status && status !== 'all') filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [invoices, total] = await Promise.all([
            this.db.collection('clinic_invoices')
                .find(filter)
                .sort({ issueDate: -1 })
                .skip(skip).limit(Number(limit)).toArray(),
            this.db.collection('clinic_invoices').countDocuments(filter),
        ]);

        return { invoices, total, page: Number(page), limit: Number(limit) };
    }

    @Get(':clinicId/invoices/summary')
    async getInvoiceSummary(@Param('clinicId') clinicId: string) {
        const base = { clinicId: this.toId(clinicId), isDeleted: { $ne: true } };
        const agg = await this.db.collection('clinic_invoices').aggregate([
            { $match: base },
            {
                $group: {
                    _id: '$status',
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                }
            }
        ]).toArray();

        const summary: any = { totalBilled: 0, paid: 0, pending: 0, overdue: 0, count: 0 };
        agg.forEach((row: any) => {
            summary.totalBilled += row.total;
            summary.count += row.count;
            if (row._id === 'paid') summary.paid = row.total;
            if (row._id === 'pending' || row._id === 'draft') summary.pending += row.total;
            if (row._id === 'overdue') summary.overdue = row.total;
            if (row._id === 'partially_paid') summary.pending += (row.total - 0); // balance
        });

        return summary;
    }

    @Post(':clinicId/invoices')
    async createInvoice(@Param('clinicId') clinicId: string, @Body() body: any, @Request() req: any) {
        if (!body.patientId) throw new BadRequestException('patientId is required');

        const invNumber = await this.autoSequence('clinic_invoices', clinicId, 'INV');

        const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
        const subtotal = lineItems.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
        const discountTotal = lineItems.reduce((sum: number, item: any) => sum + (Number(item.discount) || 0), 0);
        const taxAmount = Number(body.taxAmount) || 0;
        const totalAmount = subtotal - discountTotal + taxAmount;

        const doc = {
            clinicId: this.toId(clinicId),
            invoiceNumber: invNumber,
            patientId: this.toId(body.patientId),
            patientName: body.patientName,
            appointmentId: body.appointmentId ? this.toId(body.appointmentId) : undefined,
            treatmentId: body.treatmentId ? this.toId(body.treatmentId) : undefined,
            issueDate: new Date(),
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            lineItems,
            subtotal,
            discountTotal,
            taxAmount,
            totalAmount,
            paidAmount: 0,
            balanceAmount: totalAmount,
            status: 'pending',
            paymentHistory: [],
            notes: body.notes,
            generatedBy: req.user?.id ? this.toId(req.user.id) : undefined,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.db.collection('clinic_invoices').insertOne(doc);

        // Auto-record income in clinic_accounts
        await this.db.collection('clinic_accounts').insertOne({
            clinicId: this.toId(clinicId),
            type: 'INCOME',
            category: 'Invoice Generated',
            amount: totalAmount,
            date: new Date(),
            description: `Invoice ${invNumber} for patient ${body.patientName || body.patientId}`,
            referenceId: result.insertedId,
            status: 'pending',
            createdAt: new Date(),
        });

        // Update patient total billed
        await this.db.collection('clinic_patients').updateOne(
            { _id: this.toId(body.patientId) },
            { $inc: { totalBilled: totalAmount }, $set: { updatedAt: new Date() } }
        );

        this.logger.log(`Clinic invoice created: ${invNumber} for clinic ${clinicId}, amount: ${totalAmount}`);
        return { ...doc, _id: result.insertedId };
    }

    @Patch(':clinicId/invoices/:invId/pay')
    async recordPayment(
        @Param('clinicId') clinicId: string,
        @Param('invId') invId: string,
        @Body() body: any,
        @Request() req: any,
    ) {
        const invoice = await this.db.collection('clinic_invoices').findOne({
            _id: this.toId(invId),
            clinicId: this.toId(clinicId),
        });
        if (!invoice) throw new NotFoundException('Invoice not found');

        const newPaid = (invoice.paidAmount || 0) + Number(body.amount);
        const newBalance = invoice.totalAmount - newPaid;
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

        const payment = {
            amount: Number(body.amount),
            method: body.method || 'cash',
            date: new Date(),
            reference: body.reference,
            recordedBy: req.user?.id ? this.toId(req.user.id) : undefined,
        };

        await this.db.collection('clinic_invoices').updateOne(
            { _id: this.toId(invId) },
            {
                $set: { paidAmount: newPaid, balanceAmount: newBalance, status: newStatus, updatedAt: new Date() },
                $push: { paymentHistory: payment } as any,
            }
        );

        // Record as clinic income
        await this.db.collection('clinic_accounts').insertOne({
            clinicId: this.toId(clinicId),
            type: 'INCOME',
            category: 'Payment Received',
            amount: Number(body.amount),
            date: new Date(),
            description: `Payment for invoice ${invoice.invoiceNumber}`,
            referenceId: this.toId(invId),
            method: body.method,
            status: 'paid',
            createdAt: new Date(),
        });

        return { success: true, status: newStatus, paidAmount: newPaid, balanceAmount: newBalance };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TREATMENTS — clinic_treatments (ISOLATED from HQ treatments)
    // ══════════════════════════════════════════════════════════════════════════

    @Get(':clinicId/treatments')
    async getTreatments(
        @Param('clinicId') clinicId: string,
        @Query('status') status?: string,
        @Query('patientId') patientId?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
    ) {
        const filter: any = this.clinicFilter(clinicId);
        if (status && status !== 'all') filter.status = status;
        if (patientId) filter.patientId = this.toId(patientId);

        const skip = (Number(page) - 1) * Number(limit);
        const [treatments, total] = await Promise.all([
            this.db.collection('clinic_treatments')
                .find(filter)
                .sort({ startDate: -1 })
                .skip(skip).limit(Number(limit)).toArray(),
            this.db.collection('clinic_treatments').countDocuments(filter),
        ]);

        return { treatments, total, page: Number(page), limit: Number(limit) };
    }

    @Post(':clinicId/treatments')
    async createTreatment(@Param('clinicId') clinicId: string, @Body() body: any) {
        if (!body.patientId || !body.treatmentName) {
            throw new BadRequestException('patientId and treatmentName are required');
        }

        const patient = await this.db.collection('clinic_patients').findOne({
            _id: this.toId(body.patientId),
            clinicId: this.toId(clinicId),
        });
        if (!patient) throw new NotFoundException('Patient not found in this clinic');

        const trtCode = await this.autoSequence('clinic_treatments', clinicId, 'TRT');
        const doc = {
            clinicId: this.toId(clinicId),
            patientId: this.toId(body.patientId),
            patientName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
            treatmentCode: trtCode,
            treatmentName: body.treatmentName,
            condition: body.condition,
            treatmentPlan: body.treatmentPlan,
            icd10Code: body.icd10Code,
            assignedDoctorId: body.assignedDoctorId ? this.toId(body.assignedDoctorId) : undefined,
            assignedDoctorName: body.assignedDoctorName,
            assignedTherapistId: body.assignedTherapistId ? this.toId(body.assignedTherapistId) : undefined,
            assignedTherapistName: body.assignedTherapistName,
            startDate: new Date(body.startDate || Date.now()),
            expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : undefined,
            totalSessions: Number(body.totalSessions) || 10,
            completedSessions: 0,
            status: 'active',
            sessions: [],
            progressNotes: body.progressNotes,
            totalAmount: Number(body.totalAmount) || 0,
            paidAmount: 0,
            packageId: body.packageId ? this.toId(body.packageId) : undefined,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.db.collection('clinic_treatments').insertOne(doc);
        this.logger.log(`Clinic treatment created: ${trtCode} for clinic ${clinicId}`);
        return { ...doc, _id: result.insertedId };
    }

    @Post(':clinicId/treatments/:trtId/sessions')
    async addTreatmentSession(
        @Param('clinicId') clinicId: string,
        @Param('trtId') trtId: string,
        @Body() body: any,
    ) {
        const treatment = await this.db.collection('clinic_treatments').findOne({
            _id: this.toId(trtId),
            clinicId: this.toId(clinicId),
        });
        if (!treatment) throw new NotFoundException('Treatment not found');

        const sessionNumber = (treatment.completedSessions || 0) + 1;
        const session = {
            sessionNumber,
            date: new Date(body.date || Date.now()),
            conductedBy: body.conductedBy ? this.toId(body.conductedBy) : undefined,
            conductedByName: body.conductedByName,
            duration: Number(body.duration) || 45,
            notes: body.notes,
            painScalePre: body.painScalePre !== undefined ? Number(body.painScalePre) : undefined,
            painScalePost: body.painScalePost !== undefined ? Number(body.painScalePost) : undefined,
            functionalImprovements: body.functionalImprovements,
            exercisesGiven: body.exercisesGiven || [],
            homeProgram: body.homeProgram,
            attendanceStatus: body.attendanceStatus || 'attended',
        };

        await this.db.collection('clinic_treatments').updateOne(
            { _id: this.toId(trtId) },
            {
                $push: { sessions: session } as any,
                $inc: { completedSessions: 1 },
                $set: { updatedAt: new Date() },
            }
        );

        return { success: true, session };
    }

    @Patch(':clinicId/treatments/:trtId/status')
    async updateTreatmentStatus(
        @Param('clinicId') clinicId: string,
        @Param('trtId') trtId: string,
        @Body() body: any,
    ) {
        const validStatuses = ['active', 'on_hold', 'completed', 'discontinued'];
        if (!validStatuses.includes(body.status)) {
            throw new BadRequestException(`Invalid status: ${body.status}`);
        }

        await this.db.collection('clinic_treatments').updateOne(
            { _id: this.toId(trtId), clinicId: this.toId(clinicId) },
            {
                $set: {
                    status: body.status,
                    actualEndDate: ['completed', 'discontinued'].includes(body.status) ? new Date() : undefined,
                    discontinuationReason: body.discontinuationReason,
                    progressNotes: body.progressNotes,
                    outcomeScore: body.outcomeScore,
                    updatedAt: new Date(),
                }
            }
        );
        return { success: true };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STAFF — Uses clinic_users (correct collection, NOT HQ 'users')
    // ══════════════════════════════════════════════════════════════════════════

    @Get(':clinicId/users')
    async getClinicUsers(
        @Param('clinicId') clinicId: string,
        @Query('role') role?: string,
    ) {
        const filter: any = {
            clinicId: { $in: [this.toId(clinicId), clinicId] },
            isDeleted: { $ne: true },
        };
        if (role) filter.role = role;

        return this.db.collection('clinic_users')
            .find(filter, { projection: { password: 0 } })
            .sort({ firstName: 1 })
            .toArray();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CLINIC DASHBOARD KPI (Properly scoped to clinic collections)
    // ══════════════════════════════════════════════════════════════════════════

    @Get(':clinicId/dashboard')
    async getClinicDashboard(@Param('clinicId') clinicId: string) {
        const clinicObjId = this.toId(clinicId);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const baseFilter = { clinicId: clinicObjId, isDeleted: { $ne: true } };

        const [
            totalPatients,
            activePatients,
            todayAppointments,
            pendingAppointments,
            activeTreatments,
            revenueSummary,
        ] = await Promise.all([
            this.db.collection('clinic_patients').countDocuments(baseFilter),
            this.db.collection('clinic_patients').countDocuments({ ...baseFilter, status: 'active' }),
            this.db.collection('clinic_appointments').countDocuments({
                ...baseFilter, scheduledDate: { $gte: today, $lt: tomorrow }
            }),
            this.db.collection('clinic_appointments').countDocuments({
                ...baseFilter, status: { $in: ['scheduled', 'confirmed'] }
            }),
            this.db.collection('clinic_treatments').countDocuments({ ...baseFilter, status: 'active' }),
            this.db.collection('clinic_invoices').aggregate([
                { $match: baseFilter },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        totalCollected: { $sum: '$paidAmount' },
                        totalPending: { $sum: '$balanceAmount' },
                    }
                }
            ]).toArray(),
        ]);

        const revenue = revenueSummary[0] || { totalRevenue: 0, totalCollected: 0, totalPending: 0 };

        return {
            totalPatients,
            activePatients,
            todayAppointments,
            pendingAppointments,
            activeTreatments,
            totalRevenue: revenue.totalRevenue,
            totalCollected: revenue.totalCollected,
            totalPending: revenue.totalPending,
        };
    }
}
