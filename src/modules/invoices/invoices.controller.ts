import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  async getInvoices(@Request() req: any, @Query("month") month?: string) {
    try {
      const therapistId = req.user.id;
      const invoices = await this.invoicesService.getInvoicesByTherapist(
        therapistId,
        month,
      );

      return {
        success: true,
        data: invoices,
        count: invoices.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(":invoiceId")
  async getInvoice(@Param("invoiceId") invoiceId: string) {
    try {
      const invoice = await this.invoicesService.getInvoiceById(invoiceId);

      return {
        success: true,
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post(":invoiceId/send-whatsapp")
  async sendInvoiceWhatsApp(@Param("invoiceId") invoiceId: string) {
    try {
      const message =
        await this.invoicesService.sendInvoiceViaWhatsApp(invoiceId);

      return {
        success: true,
        message: "Invoice sent to patient",
        content: message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Put(":invoiceId/mark-paid")
  async markAsPaid(@Param("invoiceId") invoiceId: string) {
    try {
      const invoice = await this.invoicesService.markAsPaid(invoiceId);

      return {
        success: true,
        message: "Invoice marked as paid",
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get("earnings/monthly")
  async getMonthlyEarnings(@Request() req: any, @Query("month") month: string) {
    try {
      const therapistId = req.user.id;
      const earnings = await this.invoicesService.calculateTherapistEarnings(
        therapistId,
        month,
      );

      return {
        success: true,
        data: earnings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
