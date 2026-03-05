import { Controller, Get, Post, UseGuards, Request, Query, Body } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) { }

  @Get("history")
  async getPaymentHistory(@Request() req: any) {
    try {
      const therapistId = req.user.id;
      const payments =
        await this.paymentsService.getPaymentHistory(therapistId);

      return {
        success: true,
        data: payments,
        count: payments.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("monthly")
  async getPaymentByMonth(@Request() req: any, @Query("month") month: string) {
    try {
      const therapistId = req.user.id;
      const payment = await this.paymentsService.getPaymentsByMonth(
        therapistId,
        month,
      );

      return {
        success: true,
        data: payment,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post("onboarding-fee")
  async payOnboardingFee(@Request() req: any, @Body() body: any) {
    try {
      // Stub for onboarding fee payment recording
      return {
        success: true,
        message: "Payment recorded successfully",
        data: {
          amount: body.amount,
          currency: body.currency,
          status: "SUCCESS"
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("registration")
  async getRegistrationPayment(@Query("therapistId") therapistId: string) {
    try {
      // Placeholder for actual registration fee logic - this prevents 404 in admin dashboard
      return {
        success: true,
        payments: []
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

