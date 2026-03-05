import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";

export interface CreateCashfreePaymentLinkDTO {
    amount: number;
    description: string;
    customer: {
        name: string;
        email: string;
        contact: string;
    };
    metadata?: Record<string, any>;
    expiryDays?: number;
}

@Injectable()
export class CashfreeService {
    private readonly logger = new Logger(CashfreeService.name);
    private appId: string;
    private appSecret: string;
    private isConfigured: boolean = false;
    private readonly apiBaseUrl: string;

    constructor(private configService: ConfigService) {
        this.appId = this.configService.get<string>("CASHFREE_APP_ID");
        this.appSecret = this.configService.get<string>("CASHFREE_APP_SECRET");
        const mode = this.configService.get<string>("CASHFREE_MODE") || "TEST";
        this.apiBaseUrl = mode === "PROD"
            ? "https://api.cashfree.com/pg"
            : "https://sandbox.cashfree.com/pg";

        if (this.appId && this.appSecret) {
            this.isConfigured = true;
        }
    }

    private ensureConfigured() {
        if (!this.isConfigured) {
            throw new BadRequestException("Cashfree is not configured. Please set CASHFREE_APP_ID and CASHFREE_APP_SECRET.");
        }
    }

    /**
     * Create a Payment Link
     */
    async createPaymentLink(linkId: string, dto: CreateCashfreePaymentLinkDTO) {
        this.ensureConfigured();

        const expiryTime = new Date();
        expiryTime.setDate(expiryTime.getDate() + (dto.expiryDays || 7));

        try {
            const payload = {
                link_id: linkId,
                link_amount: dto.amount,
                link_currency: "INR",
                link_purpose: dto.description,
                customer_details: {
                    customer_phone: dto.customer.contact.replace("+", ""),
                    customer_email: dto.customer.email,
                    customer_name: dto.customer.name,
                },
                link_notify: {
                    send_sms: true,
                    send_email: true
                },
                link_meta: {
                    return_url: this.configService.get<string>("CASHFREE_RETURN_URL") || "https://ariesxpert.com/payment-success",
                }
            };

            const response = await axios.post(`${this.apiBaseUrl}/links`, payload, {
                headers: {
                    "x-client-id": this.appId,
                    "x-client-secret": this.appSecret,
                    "x-api-version": "2023-08-01",
                    "Content-Type": "application/json"
                }
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Cashfree Link Creation Error: ${error.response?.data?.message || error.message}`);
            throw new BadRequestException(`Failed to create Cashfree payment link: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Verify Webhook Signature
     */
    verifyWebhookSignature(signature: string, payload: string, timestamp: string): boolean {
        try {
            const data = timestamp + payload;
            const expectedSignature = crypto
                .createHmac('sha256', this.appSecret)
                .update(data)
                .digest('base64');
            return expectedSignature === signature;
        } catch (error) {
            return false;
        }
    }

    getAppId(): string {
        return this.appId;
    }

    /**
     * Initiate Therapist Payout via Cashfree
     */
    async initiatePayout(transferId: string, amount: number, beneficiaryId: string) {
        this.ensureConfigured();
        const payoutUrl = this.configService.get<string>("CASHFREE_MODE") === "PROD"
            ? "https://payout-api.cashfree.com/payout/v1"
            : "https://payout-gamma.cashfree.com/payout/v1";

        try {
            // Usually requires a separate Bearer token authentication via /authorize.
            const authResponse = await axios.post(`${payoutUrl}/authorize`, {}, {
                headers: {
                    "X-Client-Id": this.appId,
                    "X-Client-Secret": this.appSecret
                }
            });

            const token = authResponse.data.data.token;

            const payload = {
                beneId: beneficiaryId,
                amount: amount.toString(),
                transferId: transferId
            };

            const response = await axios.post(`${payoutUrl}/requestTransfer`, payload, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Cashfree Payout Error: ${error.response?.data?.message || error.message}`);
            throw new BadRequestException(`Failed to process payout: ${error.response?.data?.message || error.message}`);
        }
    }
}
