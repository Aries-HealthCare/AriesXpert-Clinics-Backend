import {
    Controller, Get, Post, Put, Delete, Body, Param, Query,
    UseGuards, Request, Patch
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';

/**
 * Clinic Portal API Controller
 * Handles all clinic-specific endpoints:
 *  - Staff (CRUD)
 *  - Accounts (Income/Expense)
 *  - Payroll
 *  - Appointments
 *  - Invoices
 *  - Settings
 */

@Controller('clinic-portal')
@UseGuards(AuthGuard('jwt'))
export class ClinicPortalController {
    constructor(
        @InjectConnection() private readonly db: Connection,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
    ) { }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private toId(id: string) { return new Types.ObjectId(id); }

    // ─── STAFF ────────────────────────────────────────────────────────────────
    @Get('staff')
    async getStaff(@Request() req: any, @Query('clinicId') qClinicId?: string) {
        const rawId = (req.user.clinicId || qClinicId || '').toString();
        const clinicIdObj = this.toId(rawId);
        // FIXED: Use clinic_users (NOT HQ 'users' collection)
        return this.db.collection('clinic_users').find({
            clinicId: { $in: [clinicIdObj, rawId] },
            role: { $in: ['clinic_owner', 'clinic_admin', 'clinic_therapist', 'receptionist', 'nurse', 'physiotherapist', 'accountant'] },
            isDeleted: { $ne: true }
        }, { projection: { password: 0 } }).toArray();
    }

    @Post('staff')
    async addStaff(@Request() req: any, @Body() body: any) {
        const clinicId = this.toId(req.user.clinicId || body.clinicId);
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(body.password || `Aries@${Date.now()}`, salt);
        const doc = {
            firstName: body.firstName,
            lastName: body.lastName || '',
            email: body.email?.toLowerCase().trim(),
            password: hash,
            phone: body.phone,
            role: body.role || 'receptionist',
            clinicId,
            isActive: true,
            isVerified: false,
            status: 'active',
            salaryConfig: { type: 'fixed', fixedAmount: Number(body.salary) || 0 },
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // FIXED: Write to clinic_users (NOT HQ 'users' collection)
        const result = await this.db.collection('clinic_users').insertOne(doc);

        let emailStatus = 'sent';
        let emailErrorStr = undefined;

        try {
            if (doc.email) {
                const resetToken = this.jwtService.sign({ id: result.insertedId.toString(), type: 'reset' }, { expiresIn: '24h' });
                const resetLink = `https://www.ariesxpert.com/reset-password?token=${resetToken}`;
                const expiryStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString();
                await this.emailService.sendPasswordResetEmail(doc.email, doc.firstName, resetLink, expiryStr);
            }
        } catch (error) {
            console.error('Failed to send activation email to new clinic staff:', error);
            emailStatus = 'failed';
            emailErrorStr = error.message || 'SMTP Configuration Missing or Invalid';
        }

        return { ...doc, _id: result.insertedId, password: undefined, emailStatus, emailWarning: emailErrorStr };
    }

    @Put('staff/:id')
    async updateStaff(@Param('id') id: string, @Request() req: any, @Body() body: any) {
        const clinicId = this.toId(body.clinicId || req.user.clinicId);
        const { password, ...safeBody } = body;
        // FIXED: Use clinic_users (NOT HQ 'users' collection)
        await this.db.collection('clinic_users').updateOne(
            { _id: this.toId(id), clinicId },
            { $set: { ...safeBody, salaryConfig: { type: 'fixed', fixedAmount: Number(body.salary) || 0 }, updatedAt: new Date() } }
        );
        return { success: true };
    }

    @Delete('staff/:id')
    async deleteStaff(@Param('id') id: string, @Request() req: any, @Query('clinicId') qClinicId?: string) {
        const clinicId = this.toId(qClinicId || req.user.clinicId);
        // FIXED: Use clinic_users (NOT HQ 'users' collection)
        await this.db.collection('clinic_users').updateOne({ _id: this.toId(id), clinicId }, { $set: { isDeleted: true } });
        return { success: true };
    }

    @Post('staff-reset-password/:id')
    async triggerStaffPasswordReset(@Param('id') id: string, @Request() req: any, @Body() body: any) {
        try {
            const rawClinicId = (body.clinicId || req.user.clinicId || '').toString();
            const clinicIdObj = this.toId(rawClinicId);

            const user = await this.db.collection('users').findOne({
                _id: this.toId(id),
                clinicId: { $in: [clinicIdObj, rawClinicId] }
            });

            if (!user || !user.email) {
                return { success: false, message: 'Staff user not found or has no email address' };
            }

            const resetToken = this.jwtService.sign(
                { id: user._id.toString(), type: 'reset' },
                { expiresIn: '24h' }
            );
            const resetLink = `https://www.ariesxpert.com/reset-password?token=${resetToken}`;
            const expiryStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString();

            await this.emailService.reloadTransporter();
            await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetLink, expiryStr);

            return { success: true, message: 'Reset link sent successfully' };
        } catch (error) {
            return { success: false, message: error.message || 'SMTP operation failed' };
        }
    }

    // ─── ACCOUNTS ─────────────────────────────────────────────────────────────
    @Get('accounts')
    async getAccounts(@Request() req: any, @Query('clinicId') qClinicId?: string) {
        const clinicId = this.toId(req.user.clinicId || qClinicId);
        return this.db.collection('clinic_accounts').find({ clinicId }).sort({ date: -1 }).toArray();
    }

    @Get('accounts/summary')
    async getAccountSummary(@Request() req: any, @Query('clinicId') qClinicId?: string) {
        const clinicId = this.toId(req.user.clinicId || qClinicId);
        const [incomeAgg, expenseAgg] = await Promise.all([
            this.db.collection('clinic_accounts').aggregate([
                { $match: { clinicId, type: 'INCOME' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray(),
            this.db.collection('clinic_accounts').aggregate([
                { $match: { clinicId, type: 'EXPENSE' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray()
        ]);
        const totalRevenue = incomeAgg[0]?.total ?? 0;
        const totalExpense = expenseAgg[0]?.total ?? 0;
        return { totalRevenue, totalExpense, netProfit: totalRevenue - totalExpense };
    }

    @Post('accounts')
    async addAccount(@Request() req: any, @Body() body: any) {
        const clinicId = this.toId(req.user.clinicId || body.clinicId);
        const doc = {
            clinicId,
            type: body.type,
            category: body.category,
            amount: Number(body.amount),
            date: new Date(body.date),
            description: body.description,
            recordedBy: this.toId(req.user.id),
            createdAt: new Date(),
        };
        const result = await this.db.collection('clinic_accounts').insertOne(doc);
        return { ...doc, _id: result.insertedId };
    }

    // ─── INVOICES / BILLING ───────────────────────────────────────────────────
    @Post('invoices')
    async createInvoice(@Request() req: any, @Body() body: any) {
        const clinicId = this.toId(req.user.clinicId || body.clinicId);
        const invoiceNumber = `INV-${Date.now()}`;
        const doc = {
            invoiceNumber,
            clinicId,
            patientId: body.patientId ? this.toId(body.patientId) : undefined,
            items: body.items || [],
            amount: Number(body.amount),
            discount: Number(body.discount) || 0,
            taxAmount: Number(body.taxAmount) || 0,
            totalAmount: Number(body.totalAmount),
            status: 'pending',
            date: new Date(),
            createdAt: new Date(),
        };
        const result = await this.db.collection('invoices').insertOne(doc);
        return { ...doc, _id: result.insertedId };
    }

    @Patch('invoices/:id/pay')
    async markInvoicePaid(@Param('id') id: string, @Request() req: any, @Body() body: any) {
        const clinicId = this.toId(body.clinicId || req.user.clinicId);
        await this.db.collection('invoices').updateOne(
            { _id: this.toId(id), clinicId },
            { $set: { status: 'paid', paymentMethod: body.paymentMethod, paidAt: new Date() } }
        );
        // Auto-record income in clinic accounts
        const invoice = await this.db.collection('invoices').findOne({ _id: this.toId(id) });
        if (invoice) {
            await this.db.collection('clinic_accounts').insertOne({
                clinicId,
                type: 'INCOME',
                category: 'Walk-in revenue',
                amount: invoice.totalAmount,
                date: new Date(),
                description: `Payment for invoice ${invoice.invoiceNumber}`,
                referenceId: id,
                recordedBy: this.toId(req.user.id),
                createdAt: new Date(),
            });
        }
        return { success: true };
    }

    // ─── APPOINTMENTS ─────────────────────────────────────────────────────────
    @Post('appointments')
    async createAppointment(@Request() req: any, @Body() body: any) {
        const clinicId = this.toId(req.user.clinicId || body.clinicId);
        const doc = {
            clinicId,
            patientId: body.patientId ? this.toId(body.patientId) : undefined,
            patientName: body.patientName,
            assignedToId: body.therapistId ? this.toId(body.therapistId) : undefined,
            appointmentType: body.visitType || body.appointmentType || 'first_consultation',
            visitMode: 'in_clinic',
            scheduledDate: new Date(body.startTime || body.scheduledDate),
            scheduledTime: body.scheduledTime || '',
            duration: Number(body.duration) || 30,
            chiefComplaint: body.chiefComplaint,
            amount: Number(body.charges || body.amount) || 0,
            status: 'scheduled',
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // FIXED: Write to clinic_appointments (NOT HQ 'visits' collection)
        const result = await this.db.collection('clinic_appointments').insertOne(doc);
        return { ...doc, _id: result.insertedId };
    }

    @Patch('appointments/:id/status')
    async updateAppointmentStatus(@Param('id') id: string, @Request() req: any, @Body() body: any) {
        const clinicId = this.toId(body.clinicId || req.user.clinicId);
        // FIXED: Use clinic_appointments (NOT HQ 'visits' collection)
        await this.db.collection('clinic_appointments').updateOne(
            { _id: this.toId(id), clinicId },
            { $set: { status: body.status, updatedAt: new Date() } }
        );
        return { success: true };
    }

    // ─── PAYROLL ──────────────────────────────────────────────────────────────
    @Get('payroll')
    async getPayroll(@Request() req: any, @Query('month') month?: string, @Query('year') year?: string, @Query('clinicId') qClinicId?: string) {
        const clinicId = this.toId(qClinicId || req.user.clinicId);
        const filter: any = { clinicId };
        if (month) filter.month = Number(month);
        if (year) filter.year = Number(year);
        return this.db.collection('salaries').find(filter).sort({ year: -1, month: -1 }).toArray();
    }

    @Post('payroll/generate')
    async generatePayslip(@Request() req: any, @Body() body: any) {
        const clinicId = this.toId(body.clinicId || req.user.clinicId);
        const now = new Date();
        const doc = {
            clinicId,
            staffId: this.toId(body.staffId),
            month: body.month || now.getMonth() + 1,
            year: body.year || now.getFullYear(),
            baseSalary: Number(body.baseSalary),
            allowances: Number(body.allowances) || 0,
            deductions: Number(body.deductions) || 0,
            bonuses: Number(body.bonuses) || 0,
            netSalary: Number(body.baseSalary) + Number(body.allowances || 0) + Number(body.bonuses || 0) - Number(body.deductions || 0),
            status: body.status || 'Pending',
            createdAt: now,
        };
        const result = await this.db.collection('salaries').insertOne(doc);
        // Auto-record as expense
        await this.db.collection('clinic_accounts').insertOne({
            clinicId,
            type: 'EXPENSE',
            category: 'Salary paid',
            amount: doc.netSalary,
            date: now,
            description: `Payroll for staff - ${body.month}/${body.year}`,
            referenceId: body.staffId,
            createdAt: now,
        });
        return { ...doc, _id: result.insertedId };
    }

    // ─── SETTINGS ─────────────────────────────────────────────────────────────
    @Put('settings/:clinicId')
    async updateSettings(@Param('clinicId') clinicId: string, @Request() req: any, @Body() body: any) {
        const { name, phone, address, logo } = body;
        await this.db.collection('clinics').updateOne(
            { _id: this.toId(clinicId) },
            { $set: { name, phone, address, logo, updatedAt: new Date() } }
        );
        return { success: true };
    }
}
