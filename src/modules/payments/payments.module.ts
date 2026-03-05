import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { Payment, PaymentSchema } from "./schemas/payment.schema";
import { PaymentTransaction, PaymentTransactionSchema } from "./schemas/payment-transaction.schema";
import { Therapist, TherapistSchema } from "../therapists/schemas/therapist.schema";

// Services
import { RazorpayService } from "./services/razorpay.service";
import { CashfreeService } from "./services/cashfree.service";
import { PaymentService } from "./services/payment.service";
import { VisitPaymentGatewayService } from "./services/visit-payment-gateway.service";

// Controllers
import { PaymentController } from "./controllers/payment.controller";
import { PaymentWebhookController } from "./controllers/payment-webhook.controller";
import { PaymentAnalyticsController } from "./controllers/payment-analytics.controller";
import { AdminPaymentController } from "./controllers/admin-payment.controller";
import { TreatmentPaymentController } from "./controllers/treatment-payment.controller";

// Consumers
import { PaymentSuccessConsumer } from "./consumers/payment-success.consumer";

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: Therapist.name, schema: TherapistSchema },
    ]),
  ],
  providers: [
    RazorpayService,
    CashfreeService,
    PaymentService,
    VisitPaymentGatewayService,
    PaymentSuccessConsumer,
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    PaymentAnalyticsController,
    AdminPaymentController,
    TreatmentPaymentController,
  ],
  exports: [PaymentService, VisitPaymentGatewayService, RazorpayService, CashfreeService],
})
export class PaymentsModule { }
