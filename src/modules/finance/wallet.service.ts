import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ClientSession } from "mongoose";
import { Cron } from "@nestjs/schedule";
import { Ledger, LedgerDocument, LedgerSchema, LedgerType, LedgerCategory, LedgerStatus } from "./schemas/ledger.schema";
import { Wallet, WalletDocument, WalletSchema } from "./schemas/wallet.schema";
import { TenantConnectionService } from "../../common/multitenancy/tenant-connection.service";
import { CashfreeService } from "../payments/services/cashfree.service";

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Ledger.name) private mainLedgerModel: Model<LedgerDocument>,
    @InjectModel(Wallet.name) private mainWalletModel: Model<WalletDocument>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly cashfreeService: CashfreeService,
  ) { }

  private async getLedgerModel(): Promise<Model<LedgerDocument>> {
    return this.tenantConnectionService.getTenantModel(Ledger.name, LedgerSchema);
  }

  private async getWalletModel(): Promise<Model<WalletDocument>> {
    return this.tenantConnectionService.getTenantModel(Wallet.name, WalletSchema);
  }

  /**
   * Monthly Payout Processing
   * Runs on the main database by default.
   */
  @Cron("0 0 5 * *")
  async processMonthlyPayouts() {
    this.logger.log("Starting monthly payout processing...");
    const wallets = await this.mainWalletModel.find({ pendingBalance: { $gt: 0 } });

    for (const wallet of wallets) {
      const pending = wallet.pendingBalance;
      wallet.lockedBalance += pending;
      wallet.pendingBalance = 0;
      await wallet.save();

      try {
        await this.cashfreeService.initiatePayout(`PAYOUT-${Date.now()}`, pending, wallet.userId);
        await this.createLedgerEntry(
          wallet.userId,
          LedgerType.CREDIT,
          LedgerCategory.PAYOUT,
          pending,
          "Monthly Payout Processed (Cashfree)",
          `PAYOUT-${Date.now()}`,
          null,
        );
      } catch (e) {
        this.logger.error(`Cashfree automatic transfer failed for ${wallet.userId}`);
        // Consider rolling back or marking as failed pending state...
        await this.createLedgerEntry(
          wallet.userId,
          LedgerType.CREDIT,
          LedgerCategory.PAYOUT,
          pending,
          "Monthly Payout Queued (Manual)",
          `PAYOUT-${Date.now()}`,
          null,
        );
      }
    }
    this.logger.log(`Processed payouts for ${wallets.length} global therapists.`);
  }

  async requestWithdrawal(userId: string, amount: number) {
    const model = await this.getWalletModel();
    const wallet = await model.findOne({ userId });
    if (!wallet) throw new BadRequestException("Wallet not found");

    if (wallet.lockedBalance < amount) throw new BadRequestException(`Insufficient balance: ${wallet.lockedBalance}`);

    const netAvailable = wallet.lockedBalance - wallet.liabilityBalance;
    if (amount > netAvailable) throw new BadRequestException(`Cannot withdraw while holding ₹${wallet.liabilityBalance} in cash.`);

    const transferId = `WITH_REQ-${Date.now()}`;

    // Process external gateway integration
    try {
      await this.cashfreeService.initiatePayout(transferId, amount, userId);
    } catch (e) {
      throw new BadRequestException("External payment gateway could not process this payout at this time.");
    }

    wallet.lockedBalance -= amount;
    await wallet.save();

    await this.createLedgerEntry(userId, LedgerType.DEBIT, LedgerCategory.PAYOUT, amount, "Withdrawal Request Processed via Cashfree", transferId, null);
    return { success: true, remainingBalance: wallet.lockedBalance };
  }

  async recordTransaction(userId: string, amount: number, type: "CASH" | "ONLINE", country: string, referenceId: string, clinicId?: string) {
    const model = await this.getLedgerModel();
    const session = await model.db.startSession();
    session.startTransaction();

    try {
      const splits = this.calculateSplits(amount, country);
      await this.createLedgerEntry("COMPANY", LedgerType.CREDIT, LedgerCategory.EARNING, splits.company, "Revenue Share", referenceId, session, clinicId);

      if (type === "ONLINE") {
        await this.createLedgerEntry(userId, LedgerType.CREDIT, LedgerCategory.EARNING, splits.therapist, "Visit Earning (Online)", referenceId, session, clinicId);
        await this.updateWallet(userId, splits.therapist, 0, session);
      } else {
        await this.createLedgerEntry(userId, LedgerType.CREDIT, LedgerCategory.EARNING, splits.therapist, "Visit Earning (Cash)", referenceId, session, clinicId);
        await this.createLedgerEntry(userId, LedgerType.DEBIT, LedgerCategory.LIABILITY, amount, "Cash Collected", referenceId, session, clinicId);
        await this.updateWallet(userId, splits.therapist, amount, session);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException("Financial recording failed");
    } finally {
      session.endSession();
    }
  }

  private async createLedgerEntry(userId: string, type: LedgerType, category: LedgerCategory, amount: number, description: string, referenceId: string, session: any, clinicId?: string) {
    const model = await this.getLedgerModel();
    const entry = new model({ userId, type, category, amount, currency: "INR", status: LedgerStatus.PENDING, description, referenceId, clinicId });
    return entry.save(session ? { session } : {});
  }

  private async updateWallet(userId: string, pendingChange: number, liabilityChange: number, session: any) {
    const model = await this.getWalletModel();
    await model.findOneAndUpdate({ userId }, { $inc: { pendingBalance: pendingChange, liabilityBalance: liabilityChange } }, { upsert: true, session });
  }

  async recordReferralBonus(userId: string, amount: number, referenceId: string, description: string) {
    const model = await this.getLedgerModel();
    const session = await model.db.startSession();
    session.startTransaction();

    try {
      await this.createLedgerEntry(userId, LedgerType.CREDIT, LedgerCategory.REFERRAL, amount, description, referenceId, session);
      await this.updateWallet(userId, amount, 0, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException("Referral bonus recording failed");
    } finally {
      session.endSession();
    }
  }

  calculateSplits(amount: number, country: string) {
    if (country?.toLowerCase() === "india") return { therapist: 500, company: Math.max(0, amount - 500) };
    return { therapist: amount * 0.6, company: amount * 0.4 };
  }

  async getRecentTransactions(clinicId?: string, limit: number = 10) {
    const model = await this.getLedgerModel();
    const filter: any = {};
    if (clinicId) filter.clinicId = clinicId;
    return model.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async getWallet(userId: string) {
    const model = await this.getWalletModel();
    let wallet = await model.findOne({ userId }).exec();
    if (!wallet) wallet = await model.create({ userId });
    return wallet;
  }

  async getLedger(query: any) {
    const model = await this.getLedgerModel();
    const { userId, category, clinicId, page = 1, limit = 10 } = query;
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (category) filter.category = category;
    if (clinicId) filter.clinicId = clinicId;

    const [data, total] = await Promise.all([
      model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async isTransactionExists(referenceId: string): Promise<boolean> {
    const model = await this.getLedgerModel();
    const count = await model.countDocuments({ referenceId }).exec();
    return count > 0;
  }

  async getFinancialSummary(userId: string, period: string = "month") {
    const model = await this.getLedgerModel();
    const now = new Date();
    const startDate = new Date();

    if (period === "today") startDate.setHours(0, 0, 0, 0);
    else if (period === "week") startDate.setDate(now.getDate() - 7);
    else if (period === "month") startDate.setMonth(now.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(now.getFullYear() - 1);

    const matchStage = {
      userId,
      createdAt: { $gte: startDate },
    };

    const stats = await model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const income = stats.find((s) => s._id === LedgerType.CREDIT)?.total || 0;
    const expense = stats.find((s) => s._id === LedgerType.DEBIT)?.total || 0;

    return { income, expense, net: income - expense };
  }
}
