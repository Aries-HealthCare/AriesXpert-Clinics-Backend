import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Razorpay from "razorpay";
import * as crypto from "crypto";

export interface CreatePaymentLinkDTO {
  amount: number;
  description: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  notify: {
    sms: boolean;
    email: boolean;
  };
  metadata: Record<string, any>;
  expiryDays?: number;
}

export interface PaymentLinkResponse {
  id: string;
  entity: string;
  accept_partial: boolean;
  amount: number;
  amount_paid: number;
  amount_due: number;
  cancelled_at: number;
  created_at: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  description: string;
  expire_by: number;
  expired_at: number;
  first_min_partial_amount: number;
  notify: {
    sms: boolean;
    email: boolean;
  };
  notes: Record<string, any>;
  notify_count: number;
  payments: {
    count: number;
  };
  reference_id: string;
  reminders_sent: number;
  short_url: string;
  source: string;
  status: string;
  updated_at: number;
  upi_link: boolean;
  user_id: string;
  whatsapp_link: boolean;
}

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    this.keyId = this.configService.get<string>("RAZORPAY_KEY_ID");
    this.keySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

    if (this.keyId && this.keySecret) {
      this.isConfigured = true;
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
  }

  private ensureConfigured() {
    if (!this.isConfigured || !this.razorpay) {
      throw new InternalServerErrorException(
        "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
      );
    }
  }

  /**
   * Create a payment link for a visit payment
   */
  async createPaymentLink(
    dto: CreatePaymentLinkDTO,
  ): Promise<PaymentLinkResponse> {
    try {
      this.ensureConfigured();

      const expiryDays = dto.expiryDays || 7;
      const expireByTimestamp =
        Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;

      const paymentLinkData = {
        amount: Math.round(dto.amount * 100), // Convert to paise
        currency: "INR",
        accept_partial: true,
        first_min_partial_amount: Math.round((dto.amount * 50) / 100), // 50% minimum
        description: dto.description,
        customer: {
          name: dto.customer.name,
          email: dto.customer.email,
          contact: dto.customer.contact,
        },
        notify: {
          sms: dto.notify?.sms ?? false,
          email: dto.notify?.email ?? false,
        },
        notes: dto.metadata,
        expire_by: expireByTimestamp,
        callback_url: this.configService.get<string>("RAZORPAY_CALLBACK_URL"),
        callback_method: "get",
      };

      const response = await this.razorpay!.paymentLink.create(paymentLinkData);
      return response as any;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create payment link: ${error.message}`,
      );
    }
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string): Promise<any> {
    try {
      this.ensureConfigured();

      const response = await this.razorpay!.paymentLink.fetch(linkId);
      return response as any;
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch payment link: ${error.message}`,
      );
    }
  }

  /**
   * Cancel a payment link
   */
  async cancelPaymentLink(linkId: string): Promise<any> {
    try {
      this.ensureConfigured();
      const response = await this.razorpay!.paymentLink.cancel(linkId, {
        reason: "Visit cancelled",
      } as any);
      return response as any;
    } catch (error) {
      throw new BadRequestException(
        `Failed to cancel payment link: ${error.message}`,
      );
    }
  }

  /**
   * Send/resend payment link notification
   */
  async sendPaymentLinkNotification(
    linkId: string,
    medium: "sms" | "email" = "sms",
  ): Promise<any> {
    try {
      this.ensureConfigured();
      const response = await this.razorpay!.paymentLink.notifyBy(
        linkId,
        medium,
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        `Failed to send payment link notification: ${error.message}`,
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    body: string,
    signature: string,
    webhookSecret: string,
  ): boolean {
    try {
      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(body);
      const generated_signature = hmac.digest("hex");
      return generated_signature === signature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      this.ensureConfigured();
      return await this.razorpay!.payments.fetch(paymentId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch payment: ${error.message}`,
      );
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<any> {
    try {
      this.ensureConfigured();
      const refundData: any = {};
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }
      if (reason) {
        refundData.notes = { reason };
      }

      return await this.razorpay!.payments.refund(paymentId, refundData);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create refund: ${error.message}`,
      );
    }
  }

  /**
   * Get refund details
   */
  async getRefund(refundId: string): Promise<any> {
    try {
      this.ensureConfigured();
      return await this.razorpay!.refunds.fetch(refundId);
    } catch (error) {
      throw new BadRequestException(`Failed to fetch refund: ${error.message}`);
    }
  }

  /**
   * Get Razorpay key ID (for frontend integration)
   */
  getKeyId(): string {
    return this.keyId;
  }
}
