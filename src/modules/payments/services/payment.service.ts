import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentTransactionSchema,
  PaymentStatus,
  PaymentSource,
  PaymentGateway,
} from "../schemas/payment-transaction.schema";
import { RazorpayService } from "./razorpay.service";
import { TenantConnectionService } from "../../../common/multitenancy/tenant-connection.service";

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentTransaction.name)
    private mainPaymentModel: Model<PaymentTransactionDocument>,
    private razorpayService: RazorpayService,
    private eventEmitter: EventEmitter2,
    private readonly tenantConnectionService: TenantConnectionService,
  ) { }

  private async getModel(): Promise<Model<PaymentTransactionDocument>> {
    // Use the clinic database connection model directly
    return this.mainPaymentModel;
  }

  /**
   * Create a payment link for a visit
   */
  async createVisitPaymentLink(
    visitId: string,
    paymentData: {
      patientId: string;
      therapistId?: string;
      amount: number;
      patientName: string;
      patientEmail: string;
      patientContact: string;
      description?: string;
      expiryDays?: number;
    },
  ): Promise<PaymentTransaction> {
    try {
      const razorpayLink = await this.razorpayService.createPaymentLink({
        amount: paymentData.amount,
        description: paymentData.description || `Visit payment - ${paymentData.patientName}`,
        customer: {
          name: paymentData.patientName,
          email: paymentData.patientEmail,
          contact: paymentData.patientContact,
        },
        notify: { sms: true, email: true },
        metadata: {
          visit_id: visitId,
          patient_id: paymentData.patientId,
          therapist_id: paymentData.therapistId,
          module: "visit",
        },
        expiryDays: paymentData.expiryDays || 7,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (paymentData.expiryDays || 7));

      const model = await this.getModel();
      const transaction = new model({
        patientId: new Types.ObjectId(paymentData.patientId),
        therapistId: paymentData.therapistId ? new Types.ObjectId(paymentData.therapistId) : undefined,
        visitId: new Types.ObjectId(visitId),
        source: PaymentSource.VISIT,
        amount: paymentData.amount,
        gateway: PaymentGateway.RAZORPAY,
        status: PaymentStatus.LINK_SENT,
        paymentLinkId: razorpayLink.id,
        paymentLinkUrl: razorpayLink.short_url,
        paymentLinkShortUrl: razorpayLink.short_url,
        expiresAt,
        metadata: {
          visit_id: visitId,
          patient_id: paymentData.patientId,
          therapist_id: paymentData.therapistId,
          module: "visit",
        },
      });

      await transaction.save();
      transaction.auditLog = transaction.auditLog || [];
      transaction.auditLog.push({
        timestamp: new Date(),
        action: "PAYMENT_LINK_CREATED",
        details: `Payment link created for visit ${visitId}`,
      });
      await transaction.save();

      return transaction;
    } catch (error) {
      throw new BadRequestException(`Failed to create payment link: ${error.message}`);
    }
  }

  async getPaymentTransaction(transactionId: string): Promise<PaymentTransaction> {
    const model = await this.getModel();
    const transaction = await model.findById(transactionId);
    if (!transaction) throw new NotFoundException("Payment transaction not found");
    return transaction;
  }

  async getPaymentByVisitId(visitId: string): Promise<PaymentTransaction> {
    const model = await this.getModel();
    const transaction = await model.findOne({ visitId: new Types.ObjectId(visitId) });
    if (!transaction) throw new NotFoundException("No payment found for this visit");
    return transaction;
  }

  async handlePaymentSuccess(paymentData: any): Promise<PaymentTransaction> {
    const model = await this.getModel();
    const transaction = await model.findOne({ paymentLinkId: paymentData.paymentLinkId });
    if (!transaction) throw new NotFoundException("Payment transaction not found");

    transaction.status = PaymentStatus.PAID;
    transaction.isPaid = true;
    transaction.transactionId = paymentData.paymentId;
    transaction.orderId = paymentData.transactionId;
    transaction.paidAt = new Date();
    transaction.webhookVerifiedAt = new Date();
    transaction.signatureValid = true;
    transaction.paymentDetails = {
      method: paymentData.paymentMethod,
      email: paymentData.email,
      contact: paymentData.contact,
      vpa: paymentData.vpa,
      bank: paymentData.bank,
    };

    transaction.auditLog = transaction.auditLog || [];
    transaction.auditLog.push({
      timestamp: new Date(),
      action: "PAYMENT_SUCCESS",
      details: `Payment received for amount ₹${paymentData.amount}`,
    });

    await transaction.save();
    return transaction;
  }

  async handlePaymentFailure(paymentLinkId: string, failureReason: string, failureCode?: string): Promise<PaymentTransaction> {
    const model = await this.getModel();
    const transaction: any = await model.findOne({ paymentLinkId });
    if (!transaction) throw new NotFoundException("Payment transaction not found");

    transaction.status = PaymentStatus.FAILED;
    transaction.failureReason = failureReason;
    transaction.failureCode = failureCode;
    transaction.auditLog = transaction.auditLog || [];
    transaction.auditLog.push({
      timestamp: new Date(),
      action: "PAYMENT_FAILED",
      details: `Payment failed: ${failureReason}`,
    });

    await transaction.save();
    return transaction;
  }

  async resendPaymentLink(transactionId: string, medium: "sms" | "email" = "sms"): Promise<boolean> {
    const transaction: any = await this.getPaymentTransaction(transactionId);
    if (transaction.status === PaymentStatus.PAID) throw new BadRequestException("Payment already received");

    try {
      await this.razorpayService.sendPaymentLinkNotification(transaction.paymentLinkId, medium);
      transaction.auditLog = transaction.auditLog || [];
      transaction.auditLog.push({
        timestamp: new Date(),
        action: "PAYMENT_LINK_RESENT",
        details: `Payment link resent via ${medium}`,
      });
      await transaction.save();
      return true;
    } catch (error) {
      throw new BadRequestException(`Failed to resend payment link: ${error.message}`);
    }
  }

  async cancelPaymentLink(transactionId: string, reason: string): Promise<PaymentTransaction> {
    const transaction: any = await this.getPaymentTransaction(transactionId);
    if (transaction.status === PaymentStatus.PAID) throw new BadRequestException("Cannot cancel a paid transaction");

    try {
      await this.razorpayService.cancelPaymentLink(transaction.paymentLinkId);
      transaction.status = PaymentStatus.CANCELLED;
      transaction.auditLog = transaction.auditLog || [];
      transaction.auditLog.push({
        timestamp: new Date(),
        action: "PAYMENT_CANCELLED",
        details: `Payment cancelled: ${reason}`,
      });
      await transaction.save();
      return transaction;
    } catch (error) {
      throw new BadRequestException(`Failed to cancel payment link: ${error.message}`);
    }
  }

  async wavePayment(transactionId: string, waivedBy: string, reason: string): Promise<PaymentTransaction> {
    const transaction: any = await this.getPaymentTransaction(transactionId);
    transaction.status = PaymentStatus.PAID;
    transaction.isPaid = true;
    transaction.paidAt = new Date();
    transaction.auditLog = transaction.auditLog || [];
    transaction.auditLog.push({
      timestamp: new Date(),
      action: "PAYMENT_WAIVED",
      details: `Payment waived by ${waivedBy}: ${reason}`,
      changedBy: waivedBy,
    });
    await transaction.save();
    return transaction;
  }

  async getPatientPaymentHistory(patientId: string, limit: number = 50): Promise<PaymentTransaction[]> {
    const model = await this.getModel();
    return model.find({ patientId: new Types.ObjectId(patientId) }).sort({ createdAt: -1 }).limit(limit);
  }

  async getPendingPaymentsForTherapist(therapistId: string): Promise<PaymentTransaction[]> {
    const model = await this.getModel();
    return model.find({
      therapistId: new Types.ObjectId(therapistId),
      status: { $in: [PaymentStatus.PENDING, PaymentStatus.LINK_SENT, PaymentStatus.FAILED] },
    });
  }

  async isVisitPaymentComplete(visitId: string): Promise<boolean> {
    const model = await this.getModel();
    const transaction = await model.findOne({ visitId: new Types.ObjectId(visitId) });
    if (!transaction) return false;
    return transaction.isPaid;
  }

  async refundPayment(transactionId: string, amount?: number, reason?: string): Promise<any> {
    const transaction: any = await this.getPaymentTransaction(transactionId);
    if (transaction.status !== PaymentStatus.PAID) throw new BadRequestException("Only paid transactions can be refunded");

    try {
      const refund = await this.razorpayService.createRefund(transaction.transactionId, amount || transaction.amount, reason);
      transaction.refundAmount = amount || transaction.amount;
      transaction.refundDetails = { refund_id: refund.id, refund_status: refund.status, refund_reason: reason };
      transaction.refundedAt = new Date();
      transaction.auditLog = transaction.auditLog || [];
      transaction.auditLog.push({
        timestamp: new Date(),
        action: "PAYMENT_REFUNDED",
        details: `Refund of ₹${transaction.refundAmount} initiated: ${reason}`,
      });
      await transaction.save();
      return { refund, transaction };
    } catch (error) {
      throw new BadRequestException(`Failed to refund payment: ${error.message}`);
    }
  }

  async getAllPayments(filters: any): Promise<any> {
    const query: any = {};
    if (filters.patientId) query.patientId = new Types.ObjectId(filters.patientId);
    if (filters.therapistId) query.therapistId = new Types.ObjectId(filters.therapistId);
    if (filters.status) query.status = filters.status;
    if (filters.gateway) query.gateway = filters.gateway;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const model = await this.getModel();
    const [data, total] = await Promise.all([
      model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      model.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async collectPayment(payload: any) {
    const { appointmentId, treatmentId, patientId, paymentType, amount, paymentMode, packageId, isPayLater } = payload;
    const model = await this.getModel();

    if (paymentType === "Regular") {
      const transaction = new model({
        patientId: new Types.ObjectId(patientId),
        visitId: new Types.ObjectId(appointmentId),
        treatmentId: new Types.ObjectId(treatmentId),
        amount: amount,
        status: isPayLater ? PaymentStatus.PENDING : PaymentStatus.PAID,
        isPaid: !isPayLater,
        paymentDetails: { method: paymentMode },
        paidAt: isPayLater ? undefined : new Date(),
        metadata: { module: "treatment_module", paymentType: "Regular" },
      });
      await transaction.save();
      return transaction;
    } else if (paymentType === "Package") {
      const transaction = new model({
        patientId: new Types.ObjectId(patientId),
        treatmentId: new Types.ObjectId(treatmentId),
        amount: amount,
        status: PaymentStatus.PAID,
        isPaid: true,
        paymentDetails: { method: paymentMode },
        paidAt: new Date(),
        metadata: { module: "treatment_module", paymentType: "Package", packageId },
      });
      await transaction.save();
      this.eventEmitter.emit("package.purchased", { treatmentId, packageId, patientId, paymentMode, amount });
      return transaction;
    }
  }

  /**
   * Mark payment as successfully paid (called by payment-success consumer)
   * Updates transaction status to PAID and records payment metadata
   */
  async markPaymentAsPaid(
    transactionId: string,
    metadata: {
      razorpayPaymentId: string;
      successAt: Date;
      verifiedAt: Date;
    },
  ) {
    const model = await this.getModel();
    const transaction: any = await model.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction not found: ${transactionId}`,
      );
    }

    transaction.status = PaymentStatus.PAID;
    transaction.paidAt = metadata.successAt;
    transaction.transactionId = metadata.razorpayPaymentId;
    transaction.verifiedAt = metadata.verifiedAt;
    transaction.isPaid = true;

    transaction.auditLog = transaction.auditLog || [];
    transaction.auditLog.push({
      timestamp: new Date(),
      action: "PAYMENT_VERIFIED",
      details: `Payment verified by Razorpay webhook: ${metadata.razorpayPaymentId}`,
    });

    return await transaction.save();
  }
}
