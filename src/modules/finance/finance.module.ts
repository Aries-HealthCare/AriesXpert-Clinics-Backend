import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FinanceService } from "./finance.service";
import { WalletService } from "./wallet.service";
import { FinanceController } from "./finance.controller";
import { WalletController } from "./wallet.controller";
import { RazorpayController } from "./razorpay.controller";
import { Transaction, TransactionSchema } from "./schemas/transaction.schema";
import { Wallet, WalletSchema } from "./schemas/wallet.schema";
import { Invoice, InvoiceSchema } from "./schemas/invoice.schema";
import { Ledger, LedgerSchema } from "./schemas/ledger.schema";
import { ClinicAccount, ClinicAccountSchema } from "./schemas/clinic-account.schema";
import { EmailModule } from "../email/email.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [
    EmailModule,
    PaymentsModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Ledger.name, schema: LedgerSchema },
      { name: ClinicAccount.name, schema: ClinicAccountSchema },
    ]),
  ],
  controllers: [FinanceController, WalletController, RazorpayController],
  providers: [FinanceService, WalletService],
  exports: [FinanceService, WalletService],
})
export class FinanceModule { }

