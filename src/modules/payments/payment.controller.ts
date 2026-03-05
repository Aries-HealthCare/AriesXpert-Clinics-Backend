import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Request as NestRequest,
} from "@nestjs/common";
import { RazorpayService } from "./razorpay.service";
import { PaymentFor } from "./payment.model";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Payments")
@Controller("payments")
export class PaymentController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Post("create")
  @ApiOperation({ summary: "Create payment order" })
  async createPayment(
    @Body("userId") userId: string,
    @Body("amount") amount: number,
    @Body("paymentFor") paymentFor: PaymentFor,
    @Body("appointmentId") appointmentId?: string,
    @Body("therapistId") therapistId?: string,
    @Body("description") description?: string,
    @Body("metadata") metadata?: any,
  ) {
    const result = await this.razorpayService.createPayment(
      userId,
      amount,
      paymentFor,
      appointmentId,
      therapistId,
      description,
      metadata,
    );

    if (!result.success) {
      throw new HttpException(
        result.error || "Failed to create payment",
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  @Post("verify")
  @ApiOperation({ summary: "Verify payment signature" })
  async verifyPayment(
    @Body("orderId") orderId: string,
    @Body("paymentId") paymentId: string,
    @Body("signature") signature: string,
  ) {
    const result = await this.razorpayService.handlePaymentSuccess(
      orderId,
      paymentId,
      signature,
    );

    if (!result.success) {
      throw new HttpException(
        result.error || "Payment verification failed",
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  @Post("failure")
  @ApiOperation({ summary: "Handle payment failure" })
  async handlePaymentFailure(
    @Body("orderId") orderId: string,
    @Body("paymentId") paymentId: string,
    @Body("reason") reason: string,
  ) {
    const result = await this.razorpayService.handlePaymentFailure(
      orderId,
      paymentId,
      reason,
    );

    if (!result.success) {
      throw new HttpException(
        result.error || "Failed to handle payment failure",
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  @Post("refund/:paymentId")
  @ApiOperation({ summary: "Refund payment" })
  async refundPayment(
    @Param("paymentId") paymentId: string,
    @Body("amount") amount?: number,
  ) {
    const result = await this.razorpayService.refundPayment(paymentId, amount);

    if (!result.success) {
      throw new HttpException(
        result.error || "Failed to refund payment",
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  @Get(":paymentId")
  @ApiOperation({ summary: "Get payment details" })
  async getPayment(@Param("paymentId") paymentId: string) {
    const result = await this.razorpayService.getPayment(paymentId);

    if (!result.success) {
      throw new HttpException(
        result.error || "Payment not found",
        HttpStatus.NOT_FOUND,
      );
    }

    return result;
  }
}
