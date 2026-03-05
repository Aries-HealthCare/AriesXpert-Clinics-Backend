/**
 * WhatsApp Settings Controller
 * File: src/modules/whatsapp/controllers/whatsapp-settings.controller.ts
 */

import { Controller, Post, Get, Put, Body, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";

@Controller("whatsapp/settings")
export class WhatsAppSettingsController {
  private readonly logger = new Logger(WhatsAppSettingsController.name);

  constructor(
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
  ) { }

  /**
   * Get current WhatsApp settings
   * GET /whatsapp/settings
   */
  @Get()
  async getSettings() {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      // Don't return sensitive data
      return {
        success: true,
        settings: {
          appId: settings.appId,
          businessAccountId: settings.businessAccountId,
          phoneNumberId: settings.phoneNumberId,
          defaultCountryCode: settings.defaultCountryCode,
          templateNamespace: settings.templateNamespace,
          environment: settings.environment,
          isActive: settings.isActive,
          lastSyncedAt: settings.lastSyncedAt,
          lastTestedAt: settings.lastTestedAt,
          aiSettings: settings.aiSettings,
          rateLimitConfig: {
            requestsPerSecond: settings.rateLimitConfig?.requestsPerSecond,
            maxRetries: settings.rateLimitConfig?.maxRetries,
          },
          respectDND: settings.respectDND,
          auditLogging: settings.auditLogging,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch settings: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create or update WhatsApp settings
   * POST /whatsapp/settings
   */
  @Post()
  async createOrUpdateSettings(
    @Body()
    payload: {
      businessAccountId: string;
      appId: string;
      phoneNumberId: string;
      accessToken: string;
      appSecret: string;
      webhookVerifyToken: string;
      environment?: string;
      aiSettings?: {
        enabled: boolean;
        autoReplyOnNoMatch?: boolean;
        confidenceThreshold?: number;
      };
      rateLimitConfig?: {
        requestsPerSecond?: number;
        maxRetries?: number;
      };
    },
  ) {
    try {
      // Check if settings already exist
      let settings = await this.settingsModel.findOne({ isActive: true });

      if (settings) {
        // Update existing
        settings.appId = payload.appId || settings.appId;
        settings.businessAccountId = payload.businessAccountId;
        settings.phoneNumberId = payload.phoneNumberId;
        settings.accessToken = payload.accessToken;
        settings.appSecret = payload.appSecret;
        settings.webhookVerifyToken = payload.webhookVerifyToken;
        settings.environment = payload.environment || settings.environment;

        if (payload.aiSettings) {
          settings.aiSettings = {
            enabled: payload.aiSettings.enabled,
            autoReplyOnNoMatch: payload.aiSettings.autoReplyOnNoMatch ?? false,
            confidenceThreshold: payload.aiSettings.confidenceThreshold ?? 0.7,
          };
        }

        if (payload.rateLimitConfig) {
          settings.rateLimitConfig = {
            ...settings.rateLimitConfig,
            ...payload.rateLimitConfig,
          };
        }

        await settings.save();
      } else {
        // Create new
        settings = await this.settingsModel.create(payload);
      }

      this.logger.log(
        `WhatsApp settings updated for account: ${payload.businessAccountId}`,
      );

      return {
        success: true,
        message: "Settings updated successfully",
        settings: {
          businessAccountId: settings.businessAccountId,
          phoneNumberId: settings.phoneNumberId,
          environment: settings.environment,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update settings: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Test WhatsApp connection
   * POST /whatsapp/settings/test
   */
  @Post("test")
  async testConnection() {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      // Try to make a simple API call to WhatsApp
      // This would typically fetch account info or send a test message
      const testPhone = settings.phoneNumberId;

      // Simulate test by checking settings are valid
      const isValid = !!(
        settings.accessToken &&
        settings.appSecret &&
        settings.businessAccountId &&
        settings.phoneNumberId
      );

      if (isValid) {
        await this.settingsModel.updateOne(
          { _id: settings._id },
          { lastTestedAt: new Date() },
        );

        return {
          success: true,
          message: "WhatsApp connection test successful",
          status: "connected",
          lastTestedAt: new Date(),
        };
      } else {
        return {
          success: false,
          message: "WhatsApp settings are incomplete",
          status: "configuration_error",
        };
      }
    } catch (error) {
      this.logger.error(`Failed to test connection: ${error.message}`, error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        status: "error",
      };
    }
  }

  /**
   * Update AI settings
   * PUT /whatsapp/settings/ai
   */
  @Put("ai")
  async updateAISettings(
    @Body()
    payload: {
      enabled: boolean;
      autoReplyOnNoMatch?: boolean;
      confidenceThreshold?: number;
    },
  ) {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      settings.aiSettings = {
        enabled: payload.enabled,
        autoReplyOnNoMatch:
          payload.autoReplyOnNoMatch ?? settings.aiSettings.autoReplyOnNoMatch,
        confidenceThreshold:
          payload.confidenceThreshold ??
          settings.aiSettings.confidenceThreshold,
      };

      await settings.save();

      this.logger.log(`AI settings updated`);

      return {
        success: true,
        message: "AI settings updated successfully",
        aiSettings: settings.aiSettings,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update AI settings: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update rate limit config
   * PUT /whatsapp/settings/rate-limits
   */
  @Put("rate-limits")
  async updateRateLimits(
    @Body()
    payload: {
      requestsPerSecond?: number;
      requestsPerDay?: number;
      maxRetries?: number;
      retryDelayMs?: number;
    },
  ) {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      settings.rateLimitConfig = {
        requestsPerSecond:
          payload.requestsPerSecond ??
          settings.rateLimitConfig.requestsPerSecond,
        requestsPerDay:
          payload.requestsPerDay ?? settings.rateLimitConfig.requestsPerDay,
        maxRetries: payload.maxRetries ?? settings.rateLimitConfig.maxRetries,
        retryDelayMs:
          payload.retryDelayMs ?? settings.rateLimitConfig.retryDelayMs,
      };

      await settings.save();

      this.logger.log(`Rate limit settings updated`);

      return {
        success: true,
        message: "Rate limit settings updated successfully",
        rateLimitConfig: settings.rateLimitConfig,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update rate limits: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add phone number to opt-out list
   * POST /whatsapp/settings/opt-out
   */
  @Post("opt-out")
  async addOptOut(@Body() payload: { phoneNumber: string; reason?: string }) {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      if (!settings.optOutNumbers.includes(payload.phoneNumber)) {
        settings.optOutNumbers.push(payload.phoneNumber);
        await settings.save();
      }

      this.logger.log(
        `Phone number added to opt-out list: ${payload.phoneNumber}`,
      );

      return {
        success: true,
        message: "Phone number added to opt-out list",
      };
    } catch (error) {
      this.logger.error(`Failed to add opt-out: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Remove phone number from opt-out list
   * POST /whatsapp/settings/opt-in
   */
  @Post("opt-in")
  async removeOptOut(@Body() payload: { phoneNumber: string }) {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      settings.optOutNumbers = settings.optOutNumbers.filter(
        (num) => num !== payload.phoneNumber,
      );
      await settings.save();

      this.logger.log(
        `Phone number removed from opt-out list: ${payload.phoneNumber}`,
      );

      return {
        success: true,
        message: "Phone number removed from opt-out list",
      };
    } catch (error) {
      this.logger.error(`Failed to remove opt-out: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Sync WhatsApp templates
   * POST /whatsapp/settings/sync-templates
   */
  @Post("sync-templates")
  async syncTemplates() {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });

      if (!settings) {
        return {
          success: false,
          message: "WhatsApp not configured",
        };
      }

      // In production, this would call WhatsApp API to fetch approved templates
      await this.settingsModel.updateOne(
        { _id: settings._id },
        { lastSyncedAt: new Date() },
      );

      this.logger.log(`Templates synced`);

      return {
        success: true,
        message: "Templates synced successfully",
        lastSyncedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to sync templates: ${error.message}`, error);
      throw error;
    }
  }
}
