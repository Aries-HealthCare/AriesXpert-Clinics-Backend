import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WhatsAppService } from "../services/whatsapp.service";

/**
 * Payment WhatsApp Consumer
 * Listens to payment events and sends WhatsApp notifications to patients and therapists
 */
@Injectable()
export class PaymentWhatsAppConsumer {
  private readonly logger = new Logger(PaymentWhatsAppConsumer.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Send payment link via WhatsApp when payment is required
   */
  @OnEvent("payment.link_created")
  async handlePaymentLinkCreated(payload: {
    visitId: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    amount: number;
    therapistName: string;
    visitDate: Date;
    paymentLink: string;
    shortUrl: string;
  }) {
    try {
      this.logger.log(
        `Sending payment link via WhatsApp: ${payload.patientPhone}`,
      );

      // Send VISIT_PAYMENT_LINK template
      await this.whatsAppService.sendSimpleTemplateMessage(
        payload.patientPhone,
        "VISIT_PAYMENT_LINK",
        {
          patient_name: payload.patientName,
          amount: payload.amount.toString(),
          therapist_name: payload.therapistName,
          visit_date: new Date(payload.visitDate).toLocaleDateString("en-IN"),
          payment_link: payload.paymentLink,
          short_url: payload.shortUrl,
        },
        [
          {
            type: "url",
            text: "Pay Now",
            url: payload.paymentLink,
          },
        ],
      );

      this.logger.log(`✓ Payment link sent to ${payload.patientName}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment link: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send payment success confirmation via WhatsApp
   */
  @OnEvent("payment.success")
  async handlePaymentSuccess(payload: {
    visitId: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    therapistId: string;
    therapistName: string;
    therapistPhone: string;
    amount: number;
    visitDate: Date;
    invoiceUrl: string;
    currency?: string;
  }) {
    try {
      this.logger.log(
        `Sending payment success notification: ${payload.patientPhone}`,
      );

      // Send PAYMENT_SUCCESS template to patient
      await this.whatsAppService.sendSimpleTemplateMessage(
        payload.patientPhone,
        "PAYMENT_SUCCESS",
        {
          patient_name: payload.patientName,
          therapist_name: payload.therapistName,
          visit_date: new Date(payload.visitDate).toLocaleDateString("en-IN"),
          amount: payload.amount.toString(),
          currency: payload.currency || "INR",
          invoice_link: payload.invoiceUrl,
        },
        [
          {
            type: "url",
            text: "View Invoice",
            url: payload.invoiceUrl,
          },
        ],
      );

      this.logger.log(`✓ Payment confirmation sent to patient`);

      // Send confirmation to therapist as well
      if (payload.therapistPhone) {
        await this.whatsAppService.sendSimpleTemplateMessage(
          payload.therapistPhone,
          "THERAPIST_PAYMENT_RECEIVED",
          {
            therapist_name: payload.therapistName,
            patient_name: payload.patientName,
            amount: payload.amount.toString(),
            visit_date: new Date(payload.visitDate).toLocaleDateString("en-IN"),
          },
        );

        this.logger.log(`✓ Payment notification sent to therapist`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send payment success notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send payment failure reminder
   */
  @OnEvent("payment.failed")
  async handlePaymentFailed(payload: {
    patientName: string;
    patientPhone: string;
    amount: number;
    paymentLink: string;
    failureReason: string;
  }) {
    try {
      this.logger.log(
        `Sending payment failed notification: ${payload.patientPhone}`,
      );

      await this.whatsAppService.sendSimpleTemplateMessage(
        payload.patientPhone,
        "PAYMENT_FAILED_RETRY",
        {
          patient_name: payload.patientName,
          amount: payload.amount.toString(),
          failure_reason: payload.failureReason,
          retry_link: payload.paymentLink,
        },
        [
          {
            type: "url",
            text: "Retry Payment",
            url: payload.paymentLink,
          },
        ],
      );

      this.logger.log(`✓ Payment retry reminder sent`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment failure notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send payment expiry reminder
   */
  @OnEvent("payment.expired")
  async handlePaymentExpired(payload: {
    patientName: string;
    patientPhone: string;
    visitDate: Date;
  }) {
    try {
      this.logger.log(
        `Sending payment expired notification: ${payload.patientPhone}`,
      );

      await this.whatsAppService.sendSimpleTemplateMessage(
        payload.patientPhone,
        "PAYMENT_LINK_EXPIRED",
        {
          patient_name: payload.patientName,
          visit_date: new Date(payload.visitDate).toLocaleDateString("en-IN"),
        },
        [
          {
            type: "text",
            text: "Contact Support",
          },
        ],
      );

      this.logger.log(`✓ Payment expiry notification sent`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment expiry notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send invoice document via WhatsApp
   */
  @OnEvent("payment.invoice_ready")
  async handleInvoiceReady(payload: {
    patientPhone: string;
    invoiceUrl: string;
    fileName: string;
    patientName: string;
  }) {
    try {
      this.logger.log(`Sending invoice document: ${payload.patientPhone}`);

      // Send invoice PDF via WhatsApp Document API
      await this.whatsAppService.sendDocument(
        payload.patientPhone,
        payload.invoiceUrl,
        payload.fileName,
        `Invoice for ${payload.patientName}`,
      );

      this.logger.log(`✓ Invoice document sent to ${payload.patientName}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invoice document: ${error.message}`,
        error.stack,
      );
    }
  }
}
