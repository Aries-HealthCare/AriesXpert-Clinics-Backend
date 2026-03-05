import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaymentService } from "./payment.service";

/**
 * Visit Payment Gateway Service
 * Handles payment-gated visit completion logic
 */
@Injectable()
export class VisitPaymentGatewayService {
  constructor(private paymentService: PaymentService) {}

  /**
   * Check if a visit requires payment
   */
  async isPaymentRequired(
    visitId: string,
    paymentRequired: boolean,
  ): Promise<boolean> {
    return paymentRequired === true;
  }

  /**
   * Prevent manual visit completion if payment is pending
   * Throws error if payment-required flag is true but payment not complete
   */
  async canCompleteVisit(
    visitId: string,
    paymentRequired: boolean,
  ): Promise<boolean> {
    if (!paymentRequired) {
      // Payment not required, allow completion
      return true;
    }

    // Payment required - check if payment is complete
    const isPaymentComplete =
      await this.paymentService.isVisitPaymentComplete(visitId);

    if (!isPaymentComplete) {
      throw new ForbiddenException(
        "Visit cannot be completed until payment is received. " +
          "Patient must pay the payment link sent via WhatsApp.",
      );
    }

    return true;
  }

  /**
   * Mark visit as awaiting payment (after therapist marks finished)
   * This transitions the visit to awaiting_payment status
   */
  async transitionToAwaitingPayment(visitId: string): Promise<void> {
    // Update visit status in database
    // This will be called from visits service
    // visit.visitStatus = 'awaiting_payment'
  }

  /**
   * Auto-complete visit after payment webhook success
   * This is called by the payment webhook handler
   */
  async autoCompleteVisitAfterPayment(visitId: string): Promise<void> {
    // Update visit status to completed
    // visit.visitStatus = 'completed'
    // visit.paymentStatus = 'paid'
  }

  /**
   * Get visit payment status
   */
  async getVisitPaymentStatus(visitId: string): Promise<{
    paymentRequired: boolean;
    paymentStatus: string;
    isPaid: boolean;
    amountDue: number;
    paidAmount: number;
    paymentLinkUrl?: string;
  }> {
    try {
      const transaction =
        await this.paymentService.getPaymentByVisitId(visitId);

      return {
        paymentRequired: true,
        paymentStatus: transaction.status,
        isPaid: transaction.isPaid,
        amountDue: transaction.amount,
        paidAmount: transaction.isPaid ? transaction.amount : 0,
        paymentLinkUrl: transaction.paymentLinkShortUrl,
      };
    } catch (error) {
      // No payment transaction found - payment not required or not yet created
      return {
        paymentRequired: false,
        paymentStatus: "none",
        isPaid: false,
        amountDue: 0,
        paidAmount: 0,
      };
    }
  }

  /**
   * Generate payment invoice after successful payment
   */
  async generatePaymentInvoice(
    visitId: string,
    transactionId: string,
  ): Promise<string> {
    // Generate PDF invoice
    // Store invoice URL in payment transaction
    // Return invoice URL
    return "https://invoices.example.com/inv-" + transactionId;
  }
}
