import {
  Controller,
  Get,
  Query,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PaymentService } from "../services/payment.service";

@Controller("payments/analytics")
export class PaymentAnalyticsController {
  constructor(private paymentService: PaymentService) {}

  @Get("summary")
  async getPaymentSummary(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException("Invalid date format");
      }

      // Get all payment transactions in date range
      const transactions = await (this as any).paymentModel
        .find({
          createdAt: { $gte: start, $lte: end },
        })
        .lean();

      const totalTransactions = transactions.length;
      const paidTransactions = transactions.filter((t) => t.status === "paid");
      const failedTransactions = transactions.filter(
        (t) => t.status === "failed",
      );
      const expiredTransactions = transactions.filter(
        (t) => t.status === "expired",
      );

      const totalRevenue = paidTransactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0,
      );
      const conversionRate =
        totalTransactions > 0
          ? (paidTransactions.length / totalTransactions) * 100
          : 0;

      // Calculate average delay for paid transactions
      const paidWithDates = paidTransactions.filter(
        (t) => t.createdAt && t.verifiedAt,
      );
      const avgDelay =
        paidWithDates.length > 0
          ? paidWithDates.reduce((sum, t) => {
              const delayMs =
                new Date(t.verifiedAt).getTime() -
                new Date(t.createdAt).getTime();
              return sum + delayMs / 1000 / 60; // Convert to minutes
            }, 0) / paidWithDates.length
          : 0;

      // Calculate link expiry rate
      const linkExpiryRate =
        totalTransactions > 0
          ? (expiredTransactions.length / totalTransactions) * 100
          : 0;

      // Find most common failure reason
      const failureReasons = failedTransactions
        .map((t) => t.failureReason || "Unknown")
        .reduce(
          (acc, reason) => {
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

      const commonFailureReason =
        Object.entries(failureReasons).length > 0
          ? Object.entries(failureReasons).sort(
              ([, a], [, b]) => (b as number) - (a as number),
            )[0][0]
          : "None recorded";

      // Payment method breakdown
      const methodBreakdown = transactions
        .filter((t) => t.paymentMethod)
        .reduce(
          (acc, t) => {
            const existing = acc.find((m) => m.method === t.paymentMethod);
            if (existing) {
              existing.count += 1;
              existing.amount += t.amount || 0;
            } else {
              acc.push({
                method: t.paymentMethod,
                count: 1,
                amount: t.amount || 0,
              });
            }
            return acc;
          },
          [] as Array<{ method: string; count: number; amount: number }>,
        );

      return {
        statusCode: HttpStatus.OK,
        message: "Payment analytics retrieved successfully",
        data: {
          totalTransactions,
          totalRevenue,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          averagePaymentDelay: parseFloat(avgDelay.toFixed(1)),
          linkExpiryRate: parseFloat(linkExpiryRate.toFixed(2)),
          commonFailureReason,
          paymentSuccessCount: paidTransactions.length,
          paymentFailureCount: failedTransactions.length,
          paymentExpiredCount: expiredTransactions.length,
          methodBreakdown: methodBreakdown.sort((a, b) => b.count - a.count),
        },
        dateRange: {
          from: start.toISOString(),
          to: end.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        "Failed to retrieve payment analytics",
      );
    }
  }

  @Get("daily")
  async getDailyPaymentStats(@Query("days") days: string = "7") {
    try {
      const numDays = parseInt(days, 10);
      if (isNaN(numDays) || numDays < 1 || numDays > 365) {
        throw new BadRequestException("Days must be between 1 and 365");
      }

      const stats = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayTransactions = await (this as any).paymentModel
          .find({
            createdAt: { $gte: dayStart, $lte: dayEnd },
          })
          .lean();

        const paidCount = dayTransactions.filter(
          (t) => t.status === "paid",
        ).length;
        const revenue = dayTransactions
          .filter((t) => t.status === "paid")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        stats.push({
          date: dayStart.toISOString().split("T")[0],
          totalTransactions: dayTransactions.length,
          successfulPayments: paidCount,
          failedPayments: dayTransactions.filter((t) => t.status === "failed")
            .length,
          revenue,
        });
      }

      return {
        statusCode: HttpStatus.OK,
        message: "Daily payment statistics retrieved successfully",
        data: stats,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        "Failed to retrieve daily payment statistics",
      );
    }
  }

  @Get("patient/:patientId")
  async getPatientPaymentHistory(@Query("patientId") patientId: string) {
    try {
      if (!patientId) {
        throw new BadRequestException("Patient ID is required");
      }

      const transactions = await (this as any).paymentModel
        .find({ patientId })
        .sort({ createdAt: -1 })
        .lean();

      const totalAmount = transactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0,
      );
      const paidAmount = transactions
        .filter((t) => t.status === "paid")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const pendingAmount = transactions
        .filter((t) => t.status === "pending")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        statusCode: HttpStatus.OK,
        message: "Patient payment history retrieved successfully",
        data: {
          patientId,
          totalTransactions: transactions.length,
          totalAmount,
          paidAmount,
          pendingAmount,
          transactions: transactions.map((t) => ({
            id: t._id,
            visitId: t.visitId,
            amount: t.amount,
            status: t.status,
            createdAt: t.createdAt,
            verifiedAt: t.verifiedAt,
            failureReason: t.failureReason,
          })),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        "Failed to retrieve patient payment history",
      );
    }
  }

  @Get("cohort-analysis")
  async getCohortAnalysis() {
    try {
      const transactions = await (this as any).paymentModel.find().lean();

      // Group by week of creation
      const cohorts = transactions.reduce(
        (acc, t) => {
          const date = new Date(t.createdAt);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekKey = weekStart.toISOString().split("T")[0];

          if (!acc[weekKey]) {
            acc[weekKey] = {
              created: 0,
              paid: 0,
              failed: 0,
              expired: 0,
              totalAmount: 0,
              paidAmount: 0,
            };
          }

          acc[weekKey].created += 1;
          acc[weekKey].totalAmount += t.amount || 0;

          if (t.status === "paid") {
            acc[weekKey].paid += 1;
            acc[weekKey].paidAmount += t.amount || 0;
          } else if (t.status === "failed") {
            acc[weekKey].failed += 1;
          } else if (t.status === "expired") {
            acc[weekKey].expired += 1;
          }

          return acc;
        },
        {} as Record<string, any>,
      );

      return {
        statusCode: HttpStatus.OK,
        message: "Cohort analysis retrieved successfully",
        data: Object.entries(cohorts).map(([week, stats]: [string, any]) => ({
          week,
          ...stats,
          conversionRate:
            stats.created > 0
              ? ((stats.paid / stats.created) * 100).toFixed(2)
              : 0,
        })),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to retrieve cohort analysis",
      );
    }
  }
}
