import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Royalty, RoyaltyDocument } from "./schemas/royalty.schema";
import { Visit } from "../../modules/appointments/schemas/visit.schema";
import { Franchise } from "../../modules/franchises/schemas/franchise.schema";
import { Clinic } from "../../modules/clinics/schemas/clinic.schema"; // Import Clinic

@Injectable()
export class RoyaltiesService {
  constructor(
    @InjectModel(Royalty.name) private royaltyModel: Model<RoyaltyDocument>,
    @InjectModel(Visit.name) private visitModel: Model<any>,
    @InjectModel(Franchise.name) private franchiseModel: Model<any>,
    // @InjectModel(Clinic.name) private clinicModel: Model<any>, // Assume Clinic model is available if needed, or rely on aggregation
  ) { }

  async calculateMonthlyRoyalty(month: string) {
    // YYYY-MM
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    // 1. Get all active franchises
    const franchises = await this.franchiseModel.find({ status: "Active" });

    const results = [];

    for (const franchise of franchises) {
      // 2. Aggregate revenue per clinic for this franchise
      // We assume Visits have franchiseId and clinicId populated
      const revenueStats = await this.visitModel.aggregate([
        {
          $match: {
            franchiseId: franchise._id,
            startTime: { $gte: startDate, $lte: endDate },
            status: { $nin: ["cancelled", "missed"] },
            // Optionally filter by paymentStatus: 'paid' if royalty is on collection basis
            // paymentStatus: 'paid'
          },
        },
        {
          $group: {
            _id: "$clinicId",
            totalRevenue: {
              $sum: { $ifNull: ["$sessionAmount", "$amountDue", 0] },
            },
          },
        },
      ]);

      for (const stat of revenueStats) {
        if (!stat._id) continue; // Skip if no clinicId

        const revenue = stat.totalRevenue || 0;
        const royaltyAmount = (revenue * franchise.royaltyPercentage) / 100;

        // 3. Create or Update Royalty Record
        const royalty = await this.royaltyModel.findOneAndUpdate(
          {
            franchiseId: franchise._id,
            clinicId: stat._id,
            month: month,
          },
          {
            totalRevenue: revenue,
            royaltyPercentage: franchise.royaltyPercentage,
            royaltyAmount: royaltyAmount,
            // Only update status if it was not already paid/waived
            $setOnInsert: { status: "Pending" },
          },
          { upsert: true, new: true },
        );
        results.push(royalty);
      }
    }

    return {
      message: "Royalty calculation completed",
      processed: results.length,
      details: results,
    };
  }

  async findAll(query: any = {}) {
    return this.royaltyModel
      .find(query)
      .populate("franchiseId", "name")
      .populate("clinicId", "name")
      .exec();
  }

  async updateStatus(id: string, status: string, transactionId?: string) {
    return this.royaltyModel.findByIdAndUpdate(
      id,
      {
        status,
        transactionId,
        paidDate: status === "Paid" ? new Date() : undefined,
      },
      { new: true },
    );
  }
}
