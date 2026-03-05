import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";
import {
  WhatsAppNumber,
  WhatsAppNumberDocument,
} from "../schemas/whatsapp-number.schema";

@Injectable()
export class WhatsAppOnboardingService {
  private readonly logger = new Logger(WhatsAppOnboardingService.name);
  private readonly GRAPH_API_URL = "https://graph.facebook.com/v18.0";

  constructor(
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
    @InjectModel(WhatsAppNumber.name)
    private numberModel: Model<WhatsAppNumberDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Exchange short-lived token for long-lived token
   */
  async exchangeToken(
    shortLivedToken: string,
    appId: string,
    appSecret: string,
  ): Promise<string> {
    try {
      const url = `${this.GRAPH_API_URL}/oauth/access_token`;
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            grant_type: "fb_exchange_token",
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortLivedToken,
          },
        }),
      );
      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        `Failed to exchange token: ${error.message}`,
        error.response?.data,
      );
      throw new BadRequestException("Failed to exchange Facebook token");
    }
  }

  /**
   * Fetch WhatsApp Business Accounts (WABAs)
   */
  async getWABAs(accessToken: string) {
    try {
      const url = `${this.GRAPH_API_URL}/me/accounts`;
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: { access_token: accessToken },
        }),
      );
      // Filter for WhatsApp Business Accounts logic would go here if needed,
      // but usually the token gives access to specific assets.
      // For Embedded Signup, the user selects the WABA in the popup.
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch WABAs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch Phone Numbers for a WABA
   */
  async getPhoneNumbers(wabaId: string, accessToken: string) {
    try {
      const url = `${this.GRAPH_API_URL}/${wabaId}/phone_numbers`;
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: { access_token: accessToken },
        }),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch phone numbers: ${error.message}`,
        error.response?.data,
      );
      throw new BadRequestException("Failed to fetch WhatsApp phone numbers");
    }
  }

  /**
   * Register Webhook
   */
  async registerWebhook(wabaId: string, accessToken: string) {
    try {
      const webhookUrl = `${this.configService.get("API_BASE_URL")}/whatsapp/webhook`;
      const verifyToken =
        this.configService.get("WHATSAPP_VERIFY_TOKEN") ||
        "ariesxpert_verify_token";

      // 1. Subscribe App to Webhooks (if not already)
      // This step usually requires App Access Token, but for System User, user token might work for WABA specific subscriptions.
      // However, Embedded Signup often handles the App subscription.

      // We will assume the App is already configured in the Developer Portal,
      // but we can try to set the callback URL programmatically if using App Token.

      // For WABA, we need to subscribe to fields.
      const url = `${this.GRAPH_API_URL}/${wabaId}/subscribed_apps`;
      await lastValueFrom(
        this.httpService.post(
          url,
          {},
          {
            params: { access_token: accessToken },
          },
        ),
      );

      this.logger.log(`Webhook subscribed for WABA ${wabaId}`);
      return { success: true, webhookUrl, verifyToken };
    } catch (error) {
      this.logger.error(
        `Failed to register webhook: ${error.message}`,
        error.response?.data,
      );
      // Don't block the flow if this fails, just warn
      return { success: false, error: error.message };
    }
  }

  /**
   * Save Setup Configuration
   */
  async saveSetup(data: {
    wabaId: string;
    accessToken: string;
    phoneNumberId: string;
    phoneNumber: string;
    businessName: string;
    appId?: string;
    appSecret?: string;
  }) {
    // 1. Save Global Settings
    let settings = await this.settingsModel.findOne();
    if (!settings) {
      settings = new this.settingsModel();
    }

    settings.businessAccountId = data.wabaId;
    settings.accessToken = data.accessToken;
    settings.phoneNumberId = data.phoneNumberId; // Default/Primary
    settings.appId = data.appId;
    settings.appSecret = data.appSecret;
    settings.isActive = true;

    // Ensure verify token exists
    if (!settings.webhookVerifyToken) {
      settings.webhookVerifyToken =
        this.configService.get("WHATSAPP_VERIFY_TOKEN") ||
        "ariesxpert_verify_token";
    }

    // Try to fetch System User info for completeness (optional)
    try {
      // ... logic to fetch debug_token info could go here
    } catch (e) {
      this.logger.warn("Could not fetch additional token info");
    }

    await settings.save();

    // 2. Save Phone Number
    await this.numberModel.findOneAndUpdate(
      { phoneNumberId: data.phoneNumberId },
      {
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaId,
        accessToken: data.accessToken,
        nickname: data.businessName,
        status: "Connected",
        isActive: true,
      },
      { upsert: true, new: true },
    );

    // 3. Register Webhook
    await this.registerWebhook(data.wabaId, data.accessToken);

    return { success: true, settings };
  }
}
