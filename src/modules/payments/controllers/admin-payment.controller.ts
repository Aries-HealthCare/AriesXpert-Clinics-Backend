import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PaymentService } from "../services/payment.service";

@Controller("payments")
@UseGuards(AuthGuard("jwt"))
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async getAllPayments(
    @Query("patientId") patientId?: string,
    @Query("therapistId") therapistId?: string,
    @Query("status") status?: string,
    @Query("gateway") gateway?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.paymentService.getAllPayments({
      patientId,
      therapistId,
      status,
      gateway,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(":id")
  async getPaymentDetails(@Param("id") id: string) {
    return this.paymentService.getPaymentTransaction(id);
  }

  @Post("create-link")
  async createPaymentLink(@Body() body: any) {
    if (!body.visitId) {
      throw new BadRequestException("Visit ID is required");
    }
    return this.paymentService.createVisitPaymentLink(body.visitId, body);
  }

  @Post(":id/refund")
  async refundPayment(
    @Param("id") id: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.paymentService.refundPayment(id, body.amount, body.reason);
  }
}
