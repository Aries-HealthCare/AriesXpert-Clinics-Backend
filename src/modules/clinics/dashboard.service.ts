import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class DashboardService {
    constructor(
        @InjectConnection() private readonly connection: Connection,
    ) { }

    async getAdminGlobalKpi() {
        // All collections are now in the main AriesXpert database
        const clinicsCount = await this.connection.collection("clinics").countDocuments();
        const activeClinics = await this.connection.collection("clinics").countDocuments({ status: "active" });
        const patientsCount = await this.connection.collection("patients").countDocuments();
        const visitsCount = await this.connection.collection("appointments").countDocuments();

        const revenueAgg = await this.connection.collection("invoices").aggregate([
            { $match: { status: "paid" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]).toArray();
        const totalRevenue = revenueAgg[0]?.total || 0;

        // Staff count from clinic_users in main database
        const staffCount = await this.connection.collection("clinic_users").countDocuments({ isActive: true });

        return {
            totalClinics: clinicsCount,
            activeClinics,
            totalPatients: patientsCount,
            totalAppointments: visitsCount,
            totalRevenue,
            totalStaff: staffCount
        };
    }

    async getAdminClinicList() {
        return this.connection.collection("clinics").aggregate([
            {
                $lookup: {
                    from: "patients",
                    localField: "_id",
                    foreignField: "clinicId",
                    as: "patients"
                }
            },
            {
                $lookup: {
                    from: "invoices",
                    localField: "_id",
                    foreignField: "clinicId",
                    as: "invoices"
                }
            },
            {
                $lookup: {
                    from: "clinic_users",
                    localField: "_id",
                    foreignField: "clinicId",
                    as: "users"
                }
            },
            {
                $addFields: {
                    id: "$_id",
                    patientsCount: { $size: "$patients" },
                    revenue: {
                        $sum: {
                            $map: {
                                input: { $filter: { input: "$invoices", as: "inv", cond: { $eq: ["$$inv.status", "paid"] } } },
                                as: "paidInv",
                                in: "$$paidInv.amount"
                            }
                        }
                    },
                    therapists: { $filter: { input: "$users", as: "user", cond: { $eq: ["$$user.role", "clinic_therapist"] } } },
                    owners: { $filter: { input: "$users", as: "user", cond: { $in: ["$$user.role", ["clinic_owner", "clinic_admin"]] } } }
                }
            },
            {
                $project: {
                    patients: 0,
                    invoices: 0,
                    users: 0
                }
            }
        ]).toArray();
    }

    async getClinicDashboardKpi(clinicIdStr: string) {
        const mongoose = require('mongoose');
        const clinicId = new mongoose.Types.ObjectId(clinicIdStr);
        const clinicIdString = clinicIdStr;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const matchClinic = { clinicId: { $in: [clinicId, clinicIdString] } };

        // All data from main AriesXpert database
        const [
            patientsCount,
            todaysAppointments,
            homeVisitsToday,
            staffCount,
            revenueAgg,
            expenseAgg,
            pendingPaymentsAgg
        ] = await Promise.all([
            this.connection.collection("patients").countDocuments({ ...matchClinic, isDeleted: { $ne: true } }),
            this.connection.collection("appointments").countDocuments({
                ...matchClinic,
                startTime: { $gte: today, $lt: tomorrow }
            }),
            this.connection.collection("appointments").countDocuments({
                ...matchClinic,
                startTime: { $gte: today, $lt: tomorrow },
                visitType: "home-visit"
            }),
            this.connection.collection("clinic_users").countDocuments({
                ...matchClinic,
                role: { $in: ['clinic_admin', 'receptionist', 'physiotherapist', 'clinic_therapist', 'accounts_manager', 'clinic_owner'] },
                isActive: true,
                isDeleted: { $ne: true }
            }),
            // Total Revenue from Clinic Accounts (Income)
            this.connection.collection("clinic_accounts").aggregate([
                { $match: { ...matchClinic, type: "INCOME" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).toArray(),
            // Total Expense from Clinic Accounts (Expense)
            this.connection.collection("clinic_accounts").aggregate([
                { $match: { ...matchClinic, type: "EXPENSE" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).toArray(),
            // Pending Payments from Invoices
            this.connection.collection("invoices").aggregate([
                { $match: { ...matchClinic, status: "pending" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).toArray()
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;
        const totalExpense = expenseAgg[0]?.total || 0;
        const netProfit = totalRevenue - totalExpense;
        const pendingPayments = pendingPaymentsAgg[0]?.total || 0;

        return {
            totalPatients: patientsCount,
            todaysAppointments,
            homeVisitsToday,
            totalStaff: staffCount,
            totalRevenue,
            totalExpense,
            netProfit,
            pendingPayments,
            appointmentsToday: todaysAppointments, // Alias for UI
        };
    }

    async getClinicRevenueTrend(clinicIdStr: string) {
        const mongoose = require('mongoose');
        const clinicId = new mongoose.Types.ObjectId(clinicIdStr);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const trend = await this.connection.collection("invoices").aggregate([
            { $match: { clinicId, status: "paid", createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    revenue: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]).toArray();

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return trend.map(t => ({
            name: `${monthNames[t._id.month - 1]} ${t._id.year}`,
            total: t.revenue
        }));
    }

    async getClinicPatientGrowth(clinicIdStr: string) {
        const mongoose = require('mongoose');
        const clinicId = new mongoose.Types.ObjectId(clinicIdStr);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const trend = await this.connection.collection("patients").aggregate([
            { $match: { clinicId, createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    patients: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]).toArray();

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return trend.map(t => ({
            name: `${monthNames[t._id.month - 1]} ${t._id.year}`,
            patients: t.patients
        }));
    }

    async getClinicProfile(clinicIdStr: string) {
        const mongoose = require('mongoose');
        const clinicId = new mongoose.Types.ObjectId(clinicIdStr);
        return this.connection.collection("clinics").findOne({ _id: clinicId });
    }
}
