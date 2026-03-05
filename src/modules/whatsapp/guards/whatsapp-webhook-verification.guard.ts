/**
 * WhatsApp Webhook Verification Guard
 * File: src/modules/whatsapp/guards/whatsapp-webhook-verification.guard.ts
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import * as crypto from "crypto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";

@Injectable()
export class WhatsAppWebhookVerificationGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppWebhookVerificationGuard.name);

  constructor(
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // For GET requests (webhook verification from WhatsApp)
    if (request.method === "GET") {
      return this.handleWebhookVerification(request);
    }

    // For POST requests (incoming webhooks)
    if (request.method === "POST") {
      return this.handleWebhookSignatureVerification(request);
    }

    return true;
  }

  /**
   * Handle initial webhook verification from WhatsApp
   * GET /whatsapp/webhook?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=xxx
   */
  private async handleWebhookVerification(request: Request): Promise<boolean> {
    try {
      const mode = request.query["hub.mode"];
      const challenge = request.query["hub.challenge"];
      const verifyToken = request.query["hub.verify_token"];

      if (mode !== "subscribe") {
        throw new BadRequestException("Invalid webhook mode");
      }

      // Get settings to verify token
      const settings = await this.settingsModel.findOne({ isActive: true });
      if (!settings) {
        this.logger.error("WhatsApp settings not found");
        throw new BadRequestException("WhatsApp not configured");
      }

      if (verifyToken !== settings.webhookVerifyToken) {
        this.logger.warn(`Invalid webhook verification token: ${verifyToken}`);
        throw new BadRequestException("Invalid verification token");
      }

      // Store challenge for response
      request["webhook_challenge"] = challenge;

      this.logger.log("Webhook verification successful");
      return true;
    } catch (error) {
      this.logger.error(`Webhook verification failed: ${error.message}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Verify webhook signature for POST requests
   * WhatsApp sends X-Hub-Signature-256 header with HMAC SHA256
   */
  private async handleWebhookSignatureVerification(
    request: Request,
  ): Promise<boolean> {
    try {
      const signature = request.headers["x-hub-signature-256"] as string;

      if (!signature) {
        this.logger.warn("Missing X-Hub-Signature-256 header");
        throw new BadRequestException("Missing webhook signature");
      }

      // Get settings
      const settings = await this.settingsModel.findOne({ isActive: true });
      if (!settings) {
        throw new BadRequestException("WhatsApp not configured");
      }

      // Use rawBody buffer for signature verification
      // (NestJS 10+ captures this when rawBody: true is set in main.ts)
      const rawBody = (request as any).rawBody;

      if (!rawBody) {
        this.logger.error("Raw body not captured. Ensure rawBody: true is set in main.ts");
        throw new BadRequestException("Internal security configuration error");
      }

      // Compute expected signature
      const hash = crypto
        .createHmac("sha256", settings.appSecret)
        .update(rawBody)
        .digest("hex");

      const expectedSignature = `sha256=${hash}`;

      // Compare signatures using constant-time comparison to prevent timing attacks
      if (!this.constantTimeCompare(signature, expectedSignature)) {
        this.logger.warn(
          `Webhook signature verification failed: ${signature} vs ${expectedSignature}`,
        );
        throw new BadRequestException("Invalid webhook signature");
      }

      this.logger.log("Webhook signature verified successfully");
      return true;
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
        error,
      );
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
