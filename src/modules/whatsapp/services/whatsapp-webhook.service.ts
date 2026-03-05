/**
 * WhatsApp Webhook Service
 * File: src/modules/whatsapp/services/whatsapp-webhook.service.ts
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as crypto from "crypto";

import {
  WhatsAppWebhookEvent,
  WhatsAppWebhookEventDocument,
} from "../schemas/whatsapp-webhook-event.schema";
import {
  WhatsAppMessageLog,
  WhatsAppMessageLogDocument,
  MessageStatus,
} from "../schemas/whatsapp-message-log.schema";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";
import { WhatsAppAIService } from "./whatsapp-ai.service";
import { WhatsAppFlowService } from "./whatsapp-flow.service";

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @InjectModel(WhatsAppWebhookEvent.name)
    private webhookEventModel: Model<WhatsAppWebhookEventDocument>,
    @InjectModel(WhatsAppMessageLog.name)
    private messageLogModel: Model<WhatsAppMessageLogDocument>,
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
    private aiService: WhatsAppAIService,
    private flowService: WhatsAppFlowService,
  ) {}

  /**
   * Verify webhook signature from WhatsApp
   */
  async verifyWebhookSignature(
    signature: string,
    body: string,
    token: string,
  ): Promise<boolean> {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });
      if (!settings) {
        this.logger.error("WhatsApp settings not found");
        return false;
      }

      // Create expected signature
      const hash = crypto
        .createHmac("sha256", settings.appSecret)
        .update(body)
        .digest("hex");

      const expectedSignature = `sha256=${hash}`;

      // Compare signatures
      if (signature !== expectedSignature) {
        this.logger.warn(
          `Invalid webhook signature. Expected: ${expectedSignature}, Got: ${signature}`,
        );
        return false;
      }

      this.logger.log("Webhook signature verified successfully");
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to verify webhook signature: ${error.message}`,
        error,
      );
      return false;
    }
  }

  /**
   * Handle incoming message status updates
   */
  async handleStatusUpdate(event: any): Promise<void> {
    try {
      const { id: messageId, status, timestamp, errors } = event;

      // Find the message log
      const messageLog = await this.messageLogModel.findOne({
        whatsAppMessageId: messageId,
      });
      if (!messageLog) {
        this.logger.warn(
          `Message log not found for WhatsApp message ID: ${messageId}`,
        );
        return;
      }

      // Update message status
      const statusMap = {
        sent: MessageStatus.SENT,
        delivered: MessageStatus.DELIVERED,
        read: MessageStatus.READ,
        failed: MessageStatus.FAILED,
      };

      const newStatus = statusMap[status] || status;

      const updateData: any = {
        status: newStatus,
        whatsAppMetadata: {
          ...messageLog.whatsAppMetadata,
          status,
          timestamp,
        },
      };

      // Add timestamp based on status
      if (status === "sent") {
        updateData.sentAt = new Date(timestamp * 1000);
      } else if (status === "delivered") {
        updateData.deliveredAt = new Date(timestamp * 1000);
      } else if (status === "read") {
        updateData.readAt = new Date(timestamp * 1000);
        updateData.isRead = true;
      } else if (status === "failed") {
        updateData.failedAt = new Date(timestamp * 1000);
        updateData.failureReason = errors ? errors[0].message : "Unknown error";
      }

      await this.messageLogModel.updateOne({ _id: messageLog._id }, updateData);

      this.logger.log(`Message ${messageId} status updated to ${newStatus}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle status update: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Handle incoming user messages
   */
  async handleIncomingMessage(event: any): Promise<void> {
    try {
      const {
        id: messageId,
        from: senderPhone,
        timestamp,
        type,
        text,
        button,
        interactive,
        location,
        document,
        image,
        video,
      } = event;

      this.logger.log(
        `Incoming message from ${senderPhone}: Type=${type}, ID=${messageId}`,
      );

      // Idempotency check
      const existingEvent = await this.webhookEventModel.findOne({
        whatsAppEventId: messageId,
      });
      if (existingEvent) {
        this.logger.warn(`Duplicate webhook event received: ${messageId}`);
        return;
      }

      // Create webhook event record
      const webhookEvent = await this.webhookEventModel.create({
        whatsAppEventId: messageId,
        eventType: "MESSAGE_RECEIVED",
        recipientPhoneNumber: senderPhone,
        messageId,
        incomingMessage: {
          text: text?.body || "",
          type,
          mediaData: {
            document,
            image,
            video,
            location,
          },
        },
        rawPayload: event,
        isVerified: true,
      });

      // Process based on message type
      if (type === "text") {
        await this.handleTextMessage(senderPhone, text.body, messageId, event);
      } else if (type === "button") {
        await this.handleButtonResponse(
          senderPhone,
          button,
          messageId,
          event,
          webhookEvent,
        );
      } else if (type === "interactive") {
        await this.handleInteractiveResponse(
          senderPhone,
          interactive,
          messageId,
          event,
          webhookEvent,
        );
      } else if (type === "location") {
        await this.handleLocationMessage(
          senderPhone,
          location,
          messageId,
          event,
        );
      }

      // Mark webhook event as processed
      await this.webhookEventModel.updateOne(
        { _id: webhookEvent._id },
        {
          isProcessed: true,
          processedAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle incoming message: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Handle text messages with AI auto-reply
   */
  private async handleTextMessage(
    phoneNumber: string,
    text: string,
    messageId: string,
    rawEvent: any,
  ): Promise<void> {
    try {
      this.logger.log(`Processing text message: "${text}" from ${phoneNumber}`);

      // 1. Try to handle via Chatbot Flow
      const flowHandled = await this.flowService.handleMessage(
        phoneNumber,
        text,
        "text",
      );
      if (flowHandled) {
        this.logger.log("Message handled by Chatbot Flow");
        return;
      }

      // 2. Get AI settings
      const settings = await this.settingsModel.findOne({ isActive: true });
      if (!settings?.aiSettings?.enabled) {
        this.logger.log("AI auto-reply is disabled");
        return;
      }

      // 3. Process with AI
      const response = await this.aiService.generateAutoReply(text, {
        senderPhone: phoneNumber,
        messageId,
        rawContext: rawEvent,
      });

      if (response) {
        this.logger.log(`AI Generated response: ${response}`);
        // Send auto-reply
        // Assuming AI service returns text
        // Use a service method to send reply
        // For now logging it, ideally call whatsAppService.sendTextMessage
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle text message: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Handle button responses
   */
  private async handleButtonResponse(
    phoneNumber: string,
    button: any,
    messageId: string,
    rawEvent: any,
    webhookEvent: WhatsAppWebhookEventDocument,
  ): Promise<void> {
    try {
      const { text, payload } = button;

      this.logger.log(`Button response from ${phoneNumber}: "${text}"`);

      // Update webhook event with button interaction
      await this.webhookEventModel.updateOne(
        { _id: webhookEvent._id },
        {
          eventType: "BUTTON_CLICKED",
          buttonInteraction: {
            buttonText: text,
            buttonPayload: payload,
          },
        },
      );

      // Find original message and update with response
      const originalMessage = await this.messageLogModel.findOne({
        whatsAppMessageId: messageId,
      });
      if (originalMessage) {
        await this.messageLogModel.updateOne(
          { _id: originalMessage._id },
          {
            respondedWith: payload,
            respondedAt: new Date(),
          },
        );
      }

      // Trigger action based on button payload
      await this.procesButtonAction(phoneNumber, payload, originalMessage);
    } catch (error) {
      this.logger.error(
        `Failed to handle button response: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Handle interactive message responses
   */
  private async handleInteractiveResponse(
    phoneNumber: string,
    interactive: any,
    messageId: string,
    rawEvent: any,
    webhookEvent: WhatsAppWebhookEventDocument,
  ): Promise<void> {
    try {
      const { type, button_reply, list_reply } = interactive;

      let selectedPayload = "";
      let selectedText = "";

      if (button_reply) {
        selectedPayload = button_reply.id;
        selectedText = button_reply.title;
      } else if (list_reply) {
        selectedPayload = list_reply.id;
        selectedText = list_reply.title;
      }

      this.logger.log(
        `Interactive response from ${phoneNumber}: "${selectedText}"`,
      );

      // Update webhook event
      await this.webhookEventModel.updateOne(
        { _id: webhookEvent._id },
        {
          eventType: "BUTTON_CLICKED",
          buttonInteraction: {
            buttonText: selectedText,
            buttonPayload: selectedPayload,
          },
        },
      );

      // Process the action
      await this.processInteractiveAction(
        phoneNumber,
        selectedPayload,
        selectedText,
        rawEvent,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle interactive response: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Handle location messages
   */
  private async handleLocationMessage(
    phoneNumber: string,
    location: any,
    messageId: string,
    rawEvent: any,
  ): Promise<void> {
    try {
      const { latitude, longitude, accuracy } = location;

      this.logger.log(
        `Location received from ${phoneNumber}: ${latitude}, ${longitude}`,
      );

      // Could trigger location-based services
    } catch (error) {
      this.logger.error(
        `Failed to handle location message: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Process button action based on payload
   */
  private async procesButtonAction(
    phoneNumber: string,
    payload: string,
    originalMessage: any,
  ): Promise<void> {
    try {
      // Map payload to action
      const actionMap = {
        appointment_confirmed: "CONFIRM_APPOINTMENT",
        appointment_reschedule: "RESCHEDULE_APPOINTMENT",
        appointment_cancel: "CANCEL_APPOINTMENT",
        payment_confirm: "CONFIRM_PAYMENT",
        sos_acknowledged: "SOS_ACKNOWLEDGED",
      };

      const action = actionMap[payload];
      if (action) {
        this.logger.log(`Processing action: ${action} for ${phoneNumber}`);
        // Emit event to other modules to handle action
      }
    } catch (error) {
      this.logger.error(
        `Failed to process button action: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Process interactive action
   */
  private async processInteractiveAction(
    phoneNumber: string,
    payload: string,
    text: string,
    rawEvent: any,
  ): Promise<void> {
    try {
      this.logger.log(`Processing interactive action: ${payload}`);
      // Route to appropriate handler
    } catch (error) {
      this.logger.error(
        `Failed to process interactive action: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Get webhook events with filtering
   */
  async getWebhookEvents(filters: any, limit: number = 50, offset: number = 0) {
    try {
      const events = await this.webhookEventModel
        .find(filters)
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });

      const total = await this.webhookEventModel.countDocuments(filters);

      return { events, total };
    } catch (error) {
      this.logger.error(
        `Failed to fetch webhook events: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retry failed webhook events
   */
  async retryWebhookEvent(eventId: string): Promise<void> {
    try {
      const event = await this.webhookEventModel.findById(eventId);
      if (!event) {
        throw new BadRequestException("Webhook event not found");
      }

      // Reprocess based on event type
      if (event.eventType === "MESSAGE_RECEIVED") {
        await this.handleIncomingMessage(event.rawPayload);
      } else if (event.eventType === "MESSAGE_STATUS") {
        await this.handleStatusUpdate(event.rawPayload);
      }

      this.logger.log(`Webhook event ${eventId} retried`);
    } catch (error) {
      this.logger.error(
        `Failed to retry webhook event: ${error.message}`,
        error,
      );
      throw error;
    }
  }
}
