import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Invoice, InvoiceSchema } from "../finance/schemas/invoice.schema";
import { Patient, PatientSchema } from "../patients/schemas/patient.schema";
import { TenantConnectionService } from "../../common/multitenancy/tenant-connection.service";

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel("Invoice") private mainInvoiceModel: Model<any>,
    @InjectModel("Patient") private mainPatientModel: Model<any>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) { }

  private async getInvoiceModel(): Promise<Model<any>> {
    return this.tenantConnectionService.getTenantModel("Invoice", InvoiceSchema);
  }

  private async getPatientModel(): Promise<Model<any>> {
    return this.tenantConnectionService.getTenantModel("Patient", PatientSchema);
  }

  async getInvoicesByTherapist(therapistId: string, month?: string) {
    const query: any = { therapistId };
    if (month) query.month = month;

    const model = await this.getInvoiceModel();
    return model.find(query).populate("patientId", "name phone").sort({ createdAt: -1 });
  }

  async getInvoiceById(invoiceId: string) {
    const model = await this.getInvoiceModel();
    const invoice = await model.findById(invoiceId).populate("therapistId").populate("patientId").populate("visitId");
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async sendInvoiceViaWhatsApp(invoiceId: string) {
    const model = await this.getInvoiceModel();
    const invoice = await model.findById(invoiceId).populate("patientId");
    if (!invoice) throw new NotFoundException("Invoice not found");

    const patient = invoice.patientId;
    const message = `Invoice #${invoice.invoiceNumber}\nAmount: ₹${invoice.amount}\nTotal: ₹${invoice.amount + (invoice.taxAmount || 0)}`;
    console.log(`WhatsApp to ${patient.phone}: ${message}`);
    return message;
  }

  async markAsPaid(invoiceId: string) {
    const model = await this.getInvoiceModel();
    return model.findByIdAndUpdate(invoiceId, { status: "paid", paidDate: new Date() }, { new: true });
  }

  async calculateTherapistEarnings(therapistId: string, month: string) {
    const model = await this.getInvoiceModel();
    const invoices = await model.find({ therapistId, month });
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);
    return { count: invoices.length, totalAmount, totalTax, net: totalAmount - totalTax };
  }
}
