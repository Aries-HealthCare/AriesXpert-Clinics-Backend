import {
    Controller,
    Post,
    Body,
    UseGuards,
    Req,
    BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PaymentService } from "../services/payment.service";

/**
 * Treatment Module Payment Controller
 * Handles payment collection for the Treatment Module (Regular & Package)
 * POST /payments/collect — Called by receptionist after therapist submits treatment form
 */
@Controller("payments")
export class TreatmentPaymentController {
    constructor(private paymentService: PaymentService) { }

    /**
     * STEPS 9 & 10 — Collect Payment for Treatment Session
     *
     * For Regular: Marks payment PAID (pay-now) or PENDING (pay-later)
     * For Package: Marks PAID and emits package.purchased event which
     *              auto-creates all future appointments via TreatmentAutomationService
     */
    @Post("collect")
    @UseGuards(AuthGuard("jwt"))
    async collectPayment(
        @Body()
        body: {
            appointmentId: string;
            treatmentId: string;
            patientId: string;
            paymentType: "Regular" | "Package";
            amount: number;
            paymentMode: "Cash" | "UPI" | "Card" | "Online";
            packageId?: string;
            isPayLater?: boolean;
        },
        @Req() req: any,
    ) {
        if (!body.appointmentId || !body.treatmentId || !body.patientId) {
            throw new BadRequestException(
                "appointmentId, treatmentId and patientId are required",
            );
        }

        if (!body.paymentType || !["Regular", "Package"].includes(body.paymentType)) {
            throw new BadRequestException("paymentType must be Regular or Package");
        }

        if (body.paymentType === "Package" && !body.packageId) {
            throw new BadRequestException("packageId is required for Package payment");
        }

        try {
            const transaction = await this.paymentService.collectPayment({
                appointmentId: body.appointmentId,
                treatmentId: body.treatmentId,
                patientId: body.patientId,
                paymentType: body.paymentType,
                amount: body.amount || 0,
                paymentMode: body.paymentMode || "Cash",
                packageId: body.packageId,
                isPayLater: body.isPayLater || false,
            });

            return {
                success: true,
                data: transaction,
                message:
                    body.paymentType === "Package"
                        ? "Package payment collected. Future appointments are being auto-created."
                        : body.isPayLater
                            ? "Payment recorded as Pending (Pay Later)"
                            : "Payment collected successfully",
            };
        } catch (err: any) {
            throw new BadRequestException(err.message);
        }
    }
}
