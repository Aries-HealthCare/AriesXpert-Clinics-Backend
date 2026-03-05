import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment, PaymentStatus, PaymentFor } from "./payment.model";

@Injectable()
export class RazorpayService {
  private razorpayInstance: Razorpay;

  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
  ) {
    this.razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create Razorpay order
   */
  async createOrder(
    amount: number,
    currency: string = "INR",
    receipt: string,
    notes?: any,
  ): Promise<any> {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt,
        notes: notes || {},
      };

      const order = await this.razorpayInstance.orders.create(options);
      return order;
    } catch (error) {
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Create payment entry in database
   */
  async createPayment(
    userId: string,
    amount: number,
    paymentFor: PaymentFor,
    appointmentId?: string,
    therapistId?: string,
    description?: string,
    metadata?: any,
  ): Promise<any> {
    try {
      // Create Razorpay order
      const receipt = `${paymentFor}_${userId}_${Date.now()}`;
      const razorpayOrder = await this.createOrder(
        amount,
        "INR",
        receipt,
        metadata,
      );

      // Create payment record
      const payment = await this.paymentModel.create({
        userId,
        therapistId,
        appointmentId,
        amount,
        currency: "INR",
        rzpOrderId: razorpayOrder.id,
        status: PaymentStatus.PENDING,
        paymentFor,
        description,
        metadata,
        razorpayResponse: razorpayOrder,
      });

      return {
        success: true,
        payment,
        razorpayOrder,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const message = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    return generatedSignature === signature;
  }

  /**
   * Handle payment success webhook
   */
  async handlePaymentSuccess(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<any> {
    try {
      // Verify signature
      if (!this.verifyPaymentSignature(orderId, paymentId, signature)) {
        return {
          success: false,
          error: "Invalid payment signature",
        };
      }

      // Fetch payment from Razorpay
      const razorpayPayment =
        await this.razorpayInstance.payments.fetch(paymentId);

      // Update payment record
      const payment = await this.paymentModel.findOneAndUpdate(
        { rzpOrderId: orderId },
        {
          rzpPaymentId: paymentId,
          rzpSignature: signature,
          status: PaymentStatus.SUCCESS,
          razorpayResponse: razorpayPayment,
        },
        { new: true },
      );

      return {
        success: true,
        payment,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(
    orderId: string,
    paymentId: string,
    failureReason: string,
  ): Promise<any> {
    try {
      const payment = await this.paymentModel.findOneAndUpdate(
        { rzpOrderId: orderId },
        {
          rzpPaymentId: paymentId,
          status: PaymentStatus.FAILED,
          failureReason,
        },
        { new: true },
      );

      return {
        success: true,
        payment,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const refund = await this.razorpayInstance.payments.refund(paymentId, {
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      // Update payment record
      const payment = await this.paymentModel.findOneAndUpdate(
        { rzpPaymentId: paymentId },
        {
          status: PaymentStatus.REFUNDED,
          razorpayResponse: refund,
        },
        { new: true },
      );

      return {
        success: true,
        refund,
        payment,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      return {
        success: true,
        payment,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
