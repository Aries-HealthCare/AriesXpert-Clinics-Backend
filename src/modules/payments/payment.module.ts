import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Payment, PaymentSchema } from "./payment.model";
import { RazorpayService } from "./razorpay.service";
import { PaymentController } from "./payment.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
    ]),
  ],
  providers: [RazorpayService],
  controllers: [PaymentController],
  exports: [RazorpayService],
})
export class PaymentModule {}
