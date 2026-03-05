import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
  RawBodyRequest,
} from "@nestjs/common";
import { Request } from "express";
import { PaymentService } from "../services/payment.service";
import { RazorpayService } from "../services/razorpay.service";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Controller("payments")
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private paymentService: PaymentService,
    private razorpayService: RazorpayService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Razorpay Webhook Handler
   * Receives payment events from Razorpay
   */
  @Post("webhook/razorpay")
  async handleRazorpayWebhook(
    @Body() body: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string,
  ): Promise<{ status: string }> {
    try {
      const webhookSecret = this.configService.get<string>(
        "RAZORPAY_WEBHOOK_SECRET",
      );

      if (!webhookSecret) {
        throw new BadRequestException("Webhook secret not configured");
      }

      // Verify webhook signature
      const bodyString = typeof body === "string" ? body : JSON.stringify(body);
      const isValid = this.razorpayService.verifyWebhookSignature(
        bodyString,
        signature,
        webhookSecret,
      );

      if (!isValid) {
        this.logger.error("Invalid webhook signature");
        throw new BadRequestException("Invalid webhook signature");
      }

      const payload = typeof body === "string" ? JSON.parse(body) : body;

      this.logger.log(`Webhook event: ${payload.event}`);

      // Handle different payment events
      switch (payload.event) {
        case "payment_link.paid":
          await this.handlePaymentLinkPaid(payload);
          break;

        case "payment_link.failed":
          await this.handlePaymentLinkFailed(payload);
          break;

        case "payment_link.cancelled":
          await this.handlePaymentLinkCancelled(payload);
          break;

        case "payment_link.expired":
          await this.handlePaymentLinkExpired(payload);
          break;

        case "payment.captured":
          await this.handlePaymentCaptured(payload);
          break;

        case "payment.failed":
          await this.handlePaymentFailed(payload);
          break;

        default:
          this.logger.warn(`Unhandled webhook event: ${payload.event}`);
      }

      return { status: "received" };
    } catch (error) {
      this.logger.error("Webhook error:", error);
      throw new BadRequestException(
        `Webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Handle payment link paid event
   */
  private async handlePaymentLinkPaid(payload: any): Promise<void> {
    try {
      const { entity } = payload;
      const { id: paymentLinkId, payments } = entity;

      // Get payment details
      if (payments && payments.items && payments.items.length > 0) {
        const payment = payments.items[0];

        // Update payment transaction
        const transaction = await this.paymentService.handlePaymentSuccess({
          paymentLinkId,
          paymentId: payment.id,
          transactionId: payment.id,
          amount: entity.amount / 100, // Convert from paise
          paymentMethod: payment.method,
          email: payment.email,
          contact: payment.contact,
          vpa: payment.vpa,
          bank: payment.bank,
        });

        this.logger.log(
          `Payment successful for transaction: ${(transaction as any)._id}`,
        );

        // Emit event for WhatsApp message and visit completion
        this.eventEmitter.emit("payment.success", {
          transactionId: (transaction as any)._id.toString(),
          visitId: transaction.metadata.visit_id,
          patientId: transaction.patientId.toString(),
          amount: transaction.amount,
          paymentMethod: payment.method,
        });
      }
    } catch (error) {
      this.logger.error("Error handling payment link paid:", error);
      throw error;
    }
  }

  /**
   * Handle payment link failed event
   */
  private async handlePaymentLinkFailed(payload: any): Promise<void> {
    try {
      const { entity } = payload;
      const { id: paymentLinkId, error_reason } = entity;

      await this.paymentService.handlePaymentFailure(
        paymentLinkId,
        error_reason || "Payment failed",
      );

      this.logger.log(`Payment failed for link: ${paymentLinkId}`);

      // Emit event for retry reminder
      this.eventEmitter.emit("payment.failed", {
        paymentLinkId,
      });
    } catch (error) {
      this.logger.error("Error handling payment link failed:", error);
    }
  }

  /**
   * Handle payment link cancelled event
   */
  private async handlePaymentLinkCancelled(payload: any): Promise<void> {
    try {
      const { entity } = payload;
      this.logger.log(`Payment link cancelled: ${entity.id}`);
    } catch (error) {
      this.logger.error("Error handling payment link cancelled:", error);
    }
  }

  /**
   * Handle payment link expired event
   */
  private async handlePaymentLinkExpired(payload: any): Promise<void> {
    try {
      const { entity } = payload;
      const { id: paymentLinkId } = entity;

      await this.paymentService.handlePaymentFailure(
        paymentLinkId,
        "Payment link expired",
        "LINK_EXPIRED",
      );

      this.logger.log(`Payment link expired: ${paymentLinkId}`);

      // Emit event for renewal reminder
      this.eventEmitter.emit("payment.expired", {
        paymentLinkId,
      });
    } catch (error) {
      this.logger.error("Error handling payment link expired:", error);
    }
  }

  /**
   * Handle payment captured event
   */
  private async handlePaymentCaptured(payload: any): Promise<void> {
    try {
      const { entity } = payload;
      this.logger.log(`Payment captured: ${entity.id}`);
    } catch (error) {
      this.logger.error("Error handling payment captured:", error);
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(payload: any): Promise<void> {
    try {
      const { entity } = payload;
      this.logger.log(`Payment failed: ${entity.id}`);
    } catch (error) {
      this.logger.error("Error handling payment failed:", error);
    }
  }
}
