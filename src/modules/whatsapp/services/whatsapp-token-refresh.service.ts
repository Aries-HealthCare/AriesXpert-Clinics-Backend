import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { lastValueFrom } from "rxjs";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";
import {
  WhatsAppNumber,
  WhatsAppNumberDocument,
} from "../schemas/whatsapp-number.schema";

@Injectable()
export class WhatsAppTokenRefreshService {
  private readonly logger = new Logger(WhatsAppTokenRefreshService.name);
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
   * Check and refresh tokens daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkAndRefreshTokens() {
    this.logger.log("Starting daily token refresh check...");

    // 1. Refresh Global Settings Token
    const settings = await this.settingsModel.findOne({ isActive: true });
    if (settings && settings.accessToken) {
      const isExpired = await this.isTokenExpiring(settings.accessToken);
      if (isExpired) {
        this.logger.log("Refreshing global access token...");
        const newToken = await this.refreshToken(settings.accessToken);
        if (newToken) {
          settings.accessToken = newToken;
          await settings.save();
          this.logger.log("Global access token refreshed successfully");
        }
      }
    }

    // 2. Refresh Number-specific Tokens
    const numbers = await this.numberModel.find({
      isActive: true,
      accessToken: { $exists: true, $ne: null },
    });
    for (const num of numbers) {
      // Skip if using global token (same as settings)
      if (num.accessToken === settings?.accessToken) continue;

      const isExpired = await this.isTokenExpiring(num.accessToken);
      if (isExpired) {
        this.logger.log(`Refreshing token for number ${num.phoneNumber}...`);
        const newToken = await this.refreshToken(num.accessToken);
        if (newToken) {
          num.accessToken = newToken;
          await num.save();
          this.logger.log(`Token for ${num.phoneNumber} refreshed`);
        }
      }
    }
  }

  private async isTokenExpiring(token: string): Promise<boolean> {
    try {
      const url = `${this.GRAPH_API_URL}/debug_token`;
      const appId = this.configService.get("FACEBOOK_APP_ID");
      const appSecret = this.configService.get("FACEBOOK_APP_SECRET");

      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            input_token: token,
            access_token: `${appId}|${appSecret}`,
          },
        }),
      );

      const data = response.data.data;
      if (!data.is_valid) return true;

      // Check if expires within 7 days
      const now = Math.floor(Date.now() / 1000);
      const daysUntilExpiry = (data.expires_at - now) / 86400;

      return daysUntilExpiry < 7;
    } catch (error) {
      this.logger.error(`Failed to check token expiry: ${error.message}`);
      return true; // Assume expiring if check fails to force refresh attempt
    }
  }

  private async refreshToken(oldToken: string): Promise<string | null> {
    try {
      const appId = this.configService.get("FACEBOOK_APP_ID");
      const appSecret = this.configService.get("FACEBOOK_APP_SECRET");

      const url = `${this.GRAPH_API_URL}/oauth/access_token`;
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            grant_type: "fb_exchange_token",
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: oldToken,
          },
        }),
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      return null;
    }
  }
}
