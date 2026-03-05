import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PaymentService } from "../services/payment.service";
import { CashfreeService, CreateCashfreePaymentLinkDTO } from "../services/cashfree.service";

@Controller("visits/payments")
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private cashfreeService: CashfreeService
  ) { }

  /**
   * Create payment link for a visit
   */
  @Post(":visitId/create-payment-link")
  @UseGuards(AuthGuard("jwt"))
  async createPaymentLink(
    @Param("visitId") visitId: string,
    @Body()
    body: {
      patientId: string;
      therapistId?: string;
      amount: number;
      patientName: string;
      patientEmail: string;
      patientContact: string;
      expiryDays?: number;
    },
  ) {
    return this.paymentService.createVisitPaymentLink(visitId, body);
  }

  /**
   * Get payment status for a visit
   */
  @Get(":visitId/status")
  async getPaymentStatus(@Param("visitId") visitId: string) {
    try {
      const transaction =
        await this.paymentService.getPaymentByVisitId(visitId);
      return {
        paymentRequired: true,
        paymentStatus: transaction.status,
        isPaid: transaction.isPaid,
        amount: transaction.amount,
        paymentLinkUrl: transaction.paymentLinkShortUrl,
        expiresAt: transaction.expiresAt,
      };
    } catch {
      return {
        paymentRequired: false,
        paymentStatus: "none",
        isPaid: false,
      };
    }
  }

  /**
   * Get transaction details
   */
  @Get("transaction/:transactionId")
  async getTransaction(@Param("transactionId") transactionId: string) {
    return this.paymentService.getPaymentTransaction(transactionId);
  }

  /**
   * Resend payment link
   */
  @Post(":visitId/resend-link")
  @UseGuards(AuthGuard("jwt"))
  async resendPaymentLink(
    @Param("visitId") visitId: string,
    @Body() body: { medium?: "sms" | "email" },
  ) {
    try {
      const transaction =
        await this.paymentService.getPaymentByVisitId(visitId);
      await this.paymentService.resendPaymentLink(
        (transaction as any)._id.toString(),
        body.medium || "sms",
      );
      return { success: true, message: "Payment link resent" };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Admin override - waive payment
   */
  @Post(":visitId/waive-payment")
  @UseGuards(AuthGuard("jwt"))
  async waivePayment(
    @Param("visitId") visitId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    try {
      const transaction =
        await this.paymentService.getPaymentByVisitId(visitId);
      const waivedBy = req.user?.id || "admin";
      await this.paymentService.wavePayment(
        (transaction as any)._id.toString(),
        waivedBy,
        body.reason,
      );
      return { success: true, message: "Payment waived" };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get Unified Provider Configurations
   */
  @Get("gateways-config")
  async getGatewaysConfig() {
    return {
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        enabled: !!process.env.RAZORPAY_KEY_ID,
      },
      cashfree: {
        appId: process.env.CASHFREE_APP_ID,
        mode: process.env.CASHFREE_MODE || "TEST",
        enabled: !!process.env.CASHFREE_APP_ID,
      }
    };
  }

  /**
   * Create Cashfree AdHoc Link
   */
  @Post("cashfree/create-link/:id")
  @UseGuards(AuthGuard("jwt"))
  async createCashfreeLink(
    @Param("id") linkId: string,
    @Body() body: CreateCashfreePaymentLinkDTO
  ) {
    try {
      return await this.cashfreeService.createPaymentLink(linkId, body);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
