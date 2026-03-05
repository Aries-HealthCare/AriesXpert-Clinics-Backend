import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cron } from "@nestjs/schedule";
import { Transaction, TransactionDocument } from "./schemas/transaction.schema";
import { Invoice, InvoiceDocument } from "./schemas/invoice.schema";
import { Wallet, WalletDocument } from "./schemas/wallet.schema";
import { EmailService } from "../email/email.service";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Generates an invoice for a completed visit with 18% GST.
   */
  async generateInvoice(data: {
    visitId: string;
    patientId: string;
    therapistId: string;
    amount: number;
    serviceName: string;
    date: Date;
    patientName: string;
  }) {
    const taxRate = 0.18;
    const taxAmount = data.amount * taxRate;
    const totalAmount = data.amount + taxAmount;
    const invoiceNumber = `INV-${Date.now()}`;

    // Create Invoice Record
    const invoice = await this.invoiceModel.create({
      invoiceNumber,
      visitId: data.visitId,
      patientId: data.patientId,
      therapistId: data.therapistId,
      items: [{ description: data.serviceName, amount: data.amount }],
      amount: data.amount,
      taxAmount,
      totalAmount,
      status: "paid",
      date: data.date,
    });

    const html = this.generateInvoiceHtml({
      invoiceNumber,
      date: data.date.toLocaleDateString(),
      customerName: data.patientName,
      items: [{ description: data.serviceName, amount: data.amount }],
      amount: data.amount,
      taxAmount,
      totalAmount,
    });

    try {
      // Find patient email from patient model
      const patientObj: any = await this.invoiceModel.db.collection('patients').findOne({
        _id: new (require('mongoose').Types.ObjectId)(data.patientId)
      });
      const patientEmail = patientObj?.email;

      if (patientEmail) {
        const downloadUrl = `https://www.ariesxpert.com/dashboard/invoices/${invoice._id}/download`;
        await this.emailService.sendInvoiceEmail(patientEmail, data.patientName || 'Patient', invoiceNumber, totalAmount, downloadUrl);
      }
    } catch (e) {
      this.logger.error("Failed to route invoice via SMTP", e.stack);
    }

    return { invoice, html };
  }

  /**
   * Fetch invoices
   */
  async findInvoices(query: any, userClinicId?: string) {
    const { status, page = 1, limit = 10 } = query;
    const filter: any = {};

    const effectiveClinicId = userClinicId || query.clinicId;
    if (effectiveClinicId) filter.clinicId = effectiveClinicId;

    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .populate("patientId", "firstName lastName name")
        .populate("therapistId", "firstName lastName name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Monthly Settlement CRON
   */
  @Cron("0 0 5 * *")
  async processMonthlyPayouts() {
    this.logger.log("Starting monthly payout processing...");

    const wallets = await this.walletModel.find({ balance: { $gt: 0 } });

    for (const wallet of wallets) {
      try {
        const amount = wallet.lockedBalance;
        if (amount <= 0) continue;

        await this.transactionModel.create({
          walletId: wallet._id,
          type: "DEBIT",
          amount,
          category: "PAYOUT",
          status: "COMPLETED",
          description: `Monthly Payout for ${new Date().toLocaleDateString()}`,
          metadata: {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          },
        });

        wallet.lockedBalance = 0;
        await wallet.save();

        this.logger.log(`Processed payout of ${amount} for wallet ${wallet._id}`);
      } catch (error) {
        this.logger.error(`Failed to process payout for wallet ${wallet._id}: ${error.message}`);
      }
    }
  }

  private generateInvoiceHtml(data: any) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .invoice-details { text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8fafc; }
          .total-section { text-align: right; }
          .total-row { font-size: 16px; margin-bottom: 5px; }
          .grand-total { font-size: 20px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">AriesXpert Healthcare</div>
          <div class="invoice-details">
            <h1>INVOICE</h1>
            <p>#${data.invoiceNumber}</p>
            <p>Date: ${data.date}</p>
          </div>
        </div>

        <div class="bill-to">
          <h3>Bill To:</h3>
          <p>${data.customerName}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items
        .map(
          (item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>₹${item.amount.toFixed(2)}</td>
              </tr>
            `,
        )
        .join("")}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">Subtotal: ₹${data.amount.toFixed(2)}</div>
          <div class="total-row">GST (18%): ₹${data.taxAmount.toFixed(2)}</div>
          <div class="grand-total">Total: ₹${data.totalAmount.toFixed(2)}</div>
        </div>

        <div class="footer">
          <p>Thank you for choosing AriesXpert Healthcare.</p>
          <p>Contact: support@ariesxpert.com | +91-8000-770-770</p>
        </div>
      </body>
      </html>
    `;
  }
}
