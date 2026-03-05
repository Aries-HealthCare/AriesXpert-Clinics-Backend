import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel("Visit") private visitModel: Model<any>,
    @InjectModel("Invoice") private invoiceModel: Model<any>,
    @InjectModel("Lead") private leadModel: Model<any>,
    @InjectModel("Patient") private patientModel: Model<any>,
    @InjectModel("Therapist") private therapistModel: Model<any>,
    @InjectModel("Clinic") private clinicModel: Model<any>,
    @InjectModel("Franchise") private franchiseModel: Model<any>,
  ) { }

  async getTherapistDashboard(therapistId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's visits
    const todayVisits = await this.visitModel.find({
      therapistId,
      startTime: { $gte: today, $lt: tomorrow },
    });

    // This month's visits
    const monthStart = new Date(today);
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthVisits = await this.visitModel.find({
      therapistId,
      startTime: { $gte: monthStart, $lt: monthEnd },
    });

    // Upcoming appointments
    const upcomingAppointments = await this.visitModel.find({
      therapistId,
      startTime: { $gte: today },
      status: "scheduled",
    });

    // This month's earnings
    const monthKey = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}`;

    const monthEarnings = await this.invoiceModel.aggregate([
      {
        $match: {
          therapistId,
          month: monthKey,
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTax: { $sum: "$taxAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const earnings = monthEarnings[0] || {
      totalAmount: 0,
      totalTax: 0,
      count: 0,
    };

    return {
      today: {
        visitCount: todayVisits.length,
        visits: todayVisits,
      },
      thisMonth: {
        visitCount: monthVisits.length,
        earnings: earnings.totalAmount,
        tax: earnings.totalTax,
        invoices: earnings.count,
      },
      upcomingAppointments: upcomingAppointments.slice(0, 5),
    };
  }

  async getAdminDashboard(user?: any, query?: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today);
    monthStart.setDate(1);

    // --- FILTER LOGIC ---
    const filter: any = {};
    const { clinicId, franchiseId } = query || {};

    if (user) {
      if (user.role === "franchise_owner") {
        if (user.franchiseId)
          filter.franchiseId = new Types.ObjectId(user.franchiseId);
        if (clinicId) filter.clinicId = new Types.ObjectId(clinicId); // Can filter specific clinic
      } else if (["clinic_owner", "clinic_admin", "manager", "receptionist", "therapist"].includes(user.role)) {
        if (user.clinicId) filter.clinicId = new Types.ObjectId(user.clinicId);
      } else if (["founder", "admin", "super_admin"].includes(user.role)) {
        if (franchiseId) filter.franchiseId = new Types.ObjectId(franchiseId);
        if (clinicId) filter.clinicId = new Types.ObjectId(clinicId);
      }
    }

    // Total stats (Apply filter where applicable)
    // Note: Therapist and Patient might not have clinicId yet, assuming global for now or filter if schema allows
    const totalTherapists = await this.therapistModel.countDocuments(filter);
    const totalPatients = await this.patientModel.countDocuments(filter);
    const totalLeads = await this.leadModel.countDocuments(); // Leads usually global or need tagging

    const totalFranchises = await this.franchiseModel.countDocuments();
    const totalClinics = await this.clinicModel.countDocuments();

    // This month stats
    const monthKey = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}`;

    const monthVisits = await this.visitModel.countDocuments({
      startTime: { $gte: monthStart },
      ...filter,
    });

    // --- NEW FINANCIAL AGGREGATION (Visit-based) ---
    const financialStats = await this.visitModel.aggregate([
      {
        $match: {
          status: { $nin: ["cancelled", "missed"] },
          ...filter,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $ifNull: ["$sessionAmount", "$amountDue", 0] },
          },
          paidRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "paid"] },
                { $ifNull: ["$sessionAmount", "$amountDue", 0] },
                0,
              ],
            },
          },
          therapistPayouts: {
            $sum: { $ifNull: ["$therapistSessionAmount", 0] },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = financialStats[0] || {
      totalRevenue: 0,
      paidRevenue: 0,
      therapistPayouts: 0,
    };
    const unpaidRevenue = stats.totalRevenue - stats.paidRevenue;
    const businessProfit = stats.totalRevenue - stats.therapistPayouts;

    // --- WEEKLY GROWTH CALCULATION ---
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7);
    const prevWeekStart = new Date(lastWeekStart);
    prevWeekStart.setDate(lastWeekStart.getDate() - 7);

    const [
      therapistsLastWeek, therapistsPrevWeek,
      patientsLastWeek, patientsPrevWeek,
      leadsLastWeek, leadsPrevWeek,
      revenueLastWeek, revenuePrevWeek
    ] = await Promise.all([
      // Therapists
      this.therapistModel.countDocuments({ createdAt: { $gte: lastWeekStart }, ...filter }),
      this.therapistModel.countDocuments({ createdAt: { $gte: prevWeekStart, $lt: lastWeekStart }, ...filter }),
      // Patients
      this.patientModel.countDocuments({ createdAt: { $gte: lastWeekStart }, ...filter }),
      this.patientModel.countDocuments({ createdAt: { $gte: prevWeekStart, $lt: lastWeekStart }, ...filter }),
      // Leads
      this.leadModel.countDocuments({ createdAt: { $gte: lastWeekStart } }), // Leads usually global
      this.leadModel.countDocuments({ createdAt: { $gte: prevWeekStart, $lt: lastWeekStart } }),
      // Revenue (using aggregation)
      this.visitModel.aggregate([{ $match: { startTime: { $gte: lastWeekStart }, status: { $nin: ["cancelled"] }, ...filter } }, { $group: { _id: null, total: { $sum: { $ifNull: ["$sessionAmount", "$amountDue", 0] } } } }]),
      this.visitModel.aggregate([{ $match: { startTime: { $gte: prevWeekStart, $lt: lastWeekStart }, status: { $nin: ["cancelled"] }, ...filter } }, { $group: { _id: null, total: { $sum: { $ifNull: ["$sessionAmount", "$amountDue", 0] } } } }])
    ]);

    const calcGrowth = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? "100" : "0";
      return (((current - prev) / prev) * 100).toFixed(1);
    };

    const weeklyGrowth = {
      therapists: calcGrowth(therapistsLastWeek, therapistsPrevWeek),
      patients: calcGrowth(patientsLastWeek, patientsPrevWeek),
      leads: calcGrowth(leadsLastWeek, leadsPrevWeek),
      revenue: calcGrowth(revenueLastWeek[0]?.total || 0, revenuePrevWeek[0]?.total || 0),
    };

    // --- REVENUE TREND (Last 6 months) ---
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const revenueTrend = await this.visitModel.aggregate([
      {
        $match: {
          startTime: { $gte: sixMonthsAgo },
          status: { $nin: ["cancelled"] },
          ...filter,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$startTime" },
            month: { $month: "$startTime" },
          },
          revenue: { $sum: { $ifNull: ["$sessionAmount", "$amountDue", 0] } },
          payout: { $sum: { $ifNull: ["$therapistSessionAmount", 0] } },
          profit: {
            $sum: {
              $subtract: [
                { $ifNull: ["$sessionAmount", "$amountDue", 0] },
                { $ifNull: ["$therapistSessionAmount", 0] },
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const formattedTrend = revenueTrend.map((item) => ({
      name: `${item._id.month}/${item._id.year}`,
      revenue: item.revenue,
      payout: item.payout,
      profit: item.profit,
    }));

    // --- VISIT STATUS DISTRIBUTION ---
    const visitStatusDist = await this.visitModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const monthEarnings = await this.invoiceModel.aggregate([
      {
        $match: { month: monthKey, ...filter },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const earnings = monthEarnings[0] || {
      totalAmount: 0,
      totalPaid: 0,
      count: 0,
    };

    // Lead conversion rate
    const convertedLeads = await this.leadModel.countDocuments({
      status: "converted",
    });

    const conversionRate =
      totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : "0";

    // Top therapists by earnings
    const topTherapists = await this.invoiceModel.aggregate([
      {
        $match: { month: monthKey },
      },
      {
        $group: {
          _id: "$therapistId",
          totalEarnings: { $sum: "$amount" },
          visitCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "therapists",
          localField: "_id",
          foreignField: "_id",
          as: "therapist",
        },
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 5 },
    ]);

    return {
      overview: {
        totalTherapists,
        totalPatients,
        totalLeads,
        totalFranchises,
        totalClinics,
        conversionRate: `${conversionRate}%`,
        // Financial Stats
        totalRevenue: stats.totalRevenue || 0,
        paidRevenue: stats.paidRevenue || 0,
        unpaidRevenue: unpaidRevenue || 0,
        therapistPayouts: stats.therapistPayouts || 0,
        businessProfit: businessProfit || 0,
      },
      thisMonth: {
        visits: monthVisits,
        totalRevenue: earnings.totalAmount,
        collectedRevenue: earnings.totalPaid,
        invoices: earnings.count,
      },
      topTherapists,
      // Charts
      revenueTrend: formattedTrend,
      weeklyGrowth,
      visitStatusDistribution: visitStatusDist.map((d) => ({
        name: d._id || "Unknown",
        value: d.count,
      })),
    };
  }

  async getLeadConversionStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.leadModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return stats;
  }
}
