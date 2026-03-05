import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PaymentService } from "../services/payment.service";
import { VisitPaymentGatewayService } from "../services/visit-payment-gateway.service";

/**
 * Payment Success Consumer
 * Listens to 'payment.success' events emitted by PaymentWebhookController
 * Handles post-payment workflows:
 * - Auto-completes the visit
 * - Sends WhatsApp confirmation to patient
 * - Sends invoice and other documents
 * - Notifies therapist
 */
@Injectable()
export class PaymentSuccessConsumer {
  private readonly logger = new Logger(PaymentSuccessConsumer.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly visitPaymentGatewayService: VisitPaymentGatewayService,
  ) {}

  /**
   * Handle successful payment event from Razorpay webhook
   * Flows:
   * 1. Mark transaction as PAID in DB
   * 2. Update visit paymentStatus to PAID
   * 3. Auto-complete visit (if it's in awaiting_payment state)
   * 4. Generate invoice PDF
   * 5. Emit WhatsApp events for patient + therapist notifications
   * 6. Log audit trail
   */
  @OnEvent("payment.success")
  async handlePaymentSuccess(payload: {
    paymentLinkId: string;
    transactionId: string;
    visitId: string;
    patientId: string;
    therapistId: string;
    amount: number;
    currency: string;
    razorpayPaymentId: string;
    timestamp: Date;
  }) {
    try {
      this.logger.log(
        `Processing successful payment: ${payload.transactionId}`,
      );

      // Step 1: Update payment transaction to PAID
      const transaction = await this.paymentService.markPaymentAsPaid(
        payload.transactionId,
        {
          razorpayPaymentId: payload.razorpayPaymentId,
          successAt: new Date(),
          verifiedAt: new Date(),
        },
      );
      this.logger.log(`✓ Transaction marked as PAID: ${transaction._id}`);

      // Step 2: Auto-complete visit
      await this.visitPaymentGatewayService.autoCompleteVisitAfterPayment(
        payload.visitId,
      );
      this.logger.log(`✓ Visit auto-completed: ${payload.visitId}`);

      // Step 3: Generate invoice
      const invoiceUrl =
        await this.visitPaymentGatewayService.generatePaymentInvoice(
          payload.visitId,
          transaction._id,
        );
      this.logger.log(`✓ Invoice generated: ${invoiceUrl}`);

      // Step 4: Emit WhatsApp messages
      // Patient confirmation: "Payment successful, visit confirmed"
      // This will be handled by a separate WhatsApp event emitter
      // (to be implemented in whatsapp module consumer)

      this.logger.log(
        `✓ Payment success workflow completed for ${payload.visitId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing payment success event: ${error.message}`,
        error.stack,
      );
      // Don't throw - log for manual review instead
      // Send alert to admin dashboard
    }
  }

  /**
   * Handle payment with manual waiver (admin override)
   * Used when admin manually completes visit without payment
   */
  @OnEvent("payment.waived")
  async handlePaymentWaived(payload: {
    visitId: string;
    waivedBy: string;
    reason: string;
    amount: number;
  }) {
    try {
      this.logger.log(
        `Processing waived payment for visit: ${payload.visitId}`,
      );

      // Auto-complete visit when payment is waived
      await this.visitPaymentGatewayService.autoCompleteVisitAfterPayment(
        payload.visitId,
      );

      this.logger.log(
        `✓ Visit auto-completed after payment waiver: ${payload.visitId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing payment waiver: ${error.message}`,
        error.stack,
      );
    }
  }
}
