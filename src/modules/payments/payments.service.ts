import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel("Invoice") private invoiceModel: Model<any>,
    @InjectModel("Payment") private paymentModel: Model<any>,
    @InjectModel("Therapist") private therapistModel: Model<any>,
  ) { }

  /**
   * NOTE: Monthly settlement has been consolidated into WalletService.processMonthlyPayouts()
   * which runs on the 5th of every month and integrates with Cashfree for automated payouts.
   * This CRON has been intentionally removed to prevent duplicate processing.
   */

  async sendPaymentNotification(therapist: any, payment: any) {
    const message = `
Aries Healthcare - Monthly Settlement

Dear ${therapist.name},

Your settlement for ${payment.month} has been processed.

Gross Amount: ₹${payment.amount}
Tax Deducted (18%): ₹${payment.taxDeducted}
Net Amount: ₹${payment.netAmount}

The amount will be credited to your account within 24-48 hours.

Thank you for your service!
    `;

    console.log(`WhatsApp to ${therapist.phone}: ${message}`);
    // In production, send via Twilio
  }

  async getPaymentHistory(therapistId: string) {
    const payments = await this.paymentModel
      .find({ therapistId })
      .sort({ processedDate: -1 });

    return payments;
  }

  async getPaymentsByMonth(therapistId: string, month: string) {
    const payment = await this.paymentModel.findOne({
      therapistId,
      month,
    });

    return payment;
  }

  async getMonthlyPaymentStats(month: string) {
    const payments = await this.paymentModel.find({ month });

    const totalProcessed = payments.reduce((sum, p) => sum + p.netAmount, 0);

    return {
      month,
      count: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalTaxDeducted: payments.reduce((sum, p) => sum + p.taxDeducted, 0),
      totalProcessed,
    };
  }
}
