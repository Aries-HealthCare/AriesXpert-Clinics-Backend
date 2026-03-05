import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Logger,
  BadRequestException,
  Headers,
  UseGuards,
  Request,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { FinanceService } from "./finance.service";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("finance")
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly financeService: FinanceService,
    private readonly configService: ConfigService,
  ) { }

  @Post("record-payment")
  @UseGuards(JwtAuthGuard)
  async recordPayment(@Request() req: any, @Body() body: any) {
    const { userId, amount, type, country, referenceId } = body;
    const clinicId = req.user.clinicId;
    await this.walletService.recordTransaction(
      userId,
      amount,
      type,
      country,
      referenceId,
      clinicId,
    );
    return { success: true };
  }

  @Get("transactions")
  @UseGuards(JwtAuthGuard)
  async getTransactions(@Request() req: any) {
    const userRole = req.user.role;
    let userClinicId = null;

    if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
      userClinicId = req.user.clinicId;
    }

    return this.walletService.getRecentTransactions(userClinicId);
  }

  @Get("wallet/:userId")
  @UseGuards(JwtAuthGuard)
  async getWallet(@Param("userId") userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get("ledger")
  @UseGuards(JwtAuthGuard)
  async getLedger(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role;
    if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
      query.clinicId = req.user.clinicId;
    }
    return this.walletService.getLedger(query);
  }

  @Get("invoices")
  @UseGuards(JwtAuthGuard)
  async getInvoices(@Request() req: any, @Query() query: any) {
    const userRole = req.user.role;
    let userClinicId = null;

    if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
      userClinicId = req.user.clinicId;
    }

    return this.financeService.findInvoices(query, userClinicId);
  }

  @Get("summary/:userId")
  @UseGuards(JwtAuthGuard)
  async getSummary(
    @Param("userId") userId: string,
    @Query("period") period: string,
  ) {
    return this.walletService.getFinancialSummary(userId, period);
  }

  @Get("invoice/:transactionId")
  async getInvoice(@Param("transactionId") transactionId: string) {
    // const html = await this.financeService.generateInvoice(transactionId);
    // return html; // Browser will render this
    throw new BadRequestException("Invoice generation by ID not implemented");
  }

  @Post("withdraw")
  @UseGuards(JwtAuthGuard)
  async requestWithdrawal(@Request() req, @Body() body: { amount: number }) {
    const userId = req.user.sub || req.user._id; // Adapt based on JWT payload
    if (!userId) throw new BadRequestException("User not authenticated");

    return this.walletService.requestWithdrawal(userId, body.amount);
  }

  @Post("admin/run-payouts")
  @UseGuards(JwtAuthGuard) // Add AdminGuard here in real app
  async triggerMonthlyPayouts() {
    await this.walletService.processMonthlyPayouts();
    return { success: true, message: "Payout process triggered manually" };
  }

  // Real Payment Gateway Webhook (Razorpay/Stripe style)
  @Post("webhook/simulate")
  async handleWebhook(
    @Body() body: any,
    @Headers("x-razorpay-signature") signature: string,
  ) {
    this.logger.log(`Received Webhook: ${JSON.stringify(body)}`);

    // 1. Signature Verification
    const secret =
      this.configService.get<string>("RAZORPAY_WEBHOOK_SECRET") ||
      "test_secret";

    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(body))
        .digest("hex");

      if (expectedSignature !== signature) {
        this.logger.error(
          `Invalid Signature. Expected: ${expectedSignature}, Got: ${signature}`,
        );
        throw new BadRequestException("Invalid Signature");
      }
      this.logger.log("✅ Signature Verified");
    } else {
      this.logger.warn("⚠️ No Signature Header provided (Simulation Mode)");
    }

    // 2. Payload Validation
    if (!body.event || !body.payload) {
      throw new BadRequestException("Invalid Webhook Format");
    }

    const { event, payload } = body;

    if (event === "payment.captured") {
      const { userId, amount, id } = payload.payment.entity;

      // 3. Idempotency Check
      const exists = await this.walletService.isTransactionExists(id);
      if (exists) {
        this.logger.log(
          `Transaction ${id} already processed. Skipping (Idempotent).`,
        );
        return { status: "ok", message: "Already Processed" };
      }

      // 4. Process Payment
      const targetUserId = payload.payment.entity.notes?.userId || userId;
      const country = payload.payment.entity.notes?.country || "India";

      await this.walletService.recordTransaction(
        targetUserId,
        amount / 100, // Amount in paisa
        "ONLINE",
        country,
        id,
      );

      // 5. Generate Invoice (Auto-email or similar could happen here)
      // await this.financeService.generateInvoice(id);

      return { status: "ok", message: "Payment Processed" };
    }

    return { status: "ignored" };
  }
}
