/**
 * WhatsApp Main Controller
 * File: src/modules/whatsapp/controllers/whatsapp.controller.ts
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Response, Request } from "express";
import { WhatsAppService } from "../services/whatsapp.service";
import {
  WhatsAppEventService,
  WhatsAppEventType,
  WhatsAppEventPayload,
} from "../services/whatsapp-event.service";
import { WhatsAppWebhookService } from "../services/whatsapp-webhook.service";
import { WhatsAppWebhookVerificationGuard } from "../guards/whatsapp-webhook-verification.guard";
import { MessageType } from "../schemas/whatsapp-message-log.schema";
import {
  WhatsAppNumber,
  WhatsAppNumberDocument,
} from "../schemas/whatsapp-number.schema";

@Controller("whatsapp")
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private whatsAppService: WhatsAppService,
    private eventService: WhatsAppEventService,
    private webhookService: WhatsAppWebhookService,
    @InjectModel(WhatsAppNumber.name)
    private numberModel: Model<WhatsAppNumberDocument>,
  ) { }

  /**
   * Get all connected WhatsApp numbers
   * GET /whatsapp/numbers
   */
  @Get("numbers")
  async getNumbers() {
    try {
      const numbers = await this.numberModel.find({ isActive: true }).exec();
      return numbers || [];
    } catch (error) {
      this.logger.error(`Failed to fetch numbers: ${error.message}`);
      return [];
    }
  }

  /**
   * Webhook endpoint for WhatsApp
   * GET: Initial verification
   * POST: Incoming messages and status updates
   */
  @Get("webhook")
  @UseGuards(WhatsAppWebhookVerificationGuard)
  handleWebhookVerification(@Req() req: Request, @Res() res: Response) {
    const challenge = req["webhook_challenge"];
    this.logger.log(
      `Webhook verified, responding with challenge: ${challenge}`,
    );
    res.status(200).send(challenge);
  }

  @Post("webhook")
  @UseGuards(WhatsAppWebhookVerificationGuard)
  async handleWebhookEvent(@Body() payload: any, @Res() res: Response) {
    try {
      this.logger.log(`Webhook received: ${JSON.stringify(payload)}`);

      // Process webhook payload
      const { entry } = payload;

      if (entry && entry[0].changes) {
        for (const change of entry[0].changes) {
          const { value } = change;

          if (value.messages) {
            // Handle incoming messages
            for (const message of value.messages) {
              await this.webhookService.handleIncomingMessage(message);
            }
          }

          if (value.statuses) {
            // Handle message status updates
            for (const status of value.statuses) {
              await this.webhookService.handleStatusUpdate(status);
            }
          }

          if (value.opt_in) {
            // Handle opt-in
            this.logger.log(`User opted in: ${value.contacts[0].wa_id}`);
          }

          if (value.opt_out) {
            // Handle opt-out
            this.logger.log(`User opted out: ${value.contacts[0].wa_id}`);
          }
        }
      }

      // WhatsApp expects 200 OK
      res.status(200).json({ success: true });
    } catch (error) {
      this.logger.error(`Failed to handle webhook: ${error.message}`, error);
      res.status(200).json({ success: false }); // Still return 200 to WhatsApp
    }
  }

  /**
   * Send template message
   * POST /whatsapp/send/template
   */
  @Post("send/template")
  async sendTemplateMessage(
    @Body()
    payload: {
      phoneNumber: string;
      templateName: string;
      variables?: Record<string, any>;
      userId?: string;
      leadId?: string;
      patientId?: string;
      appointmentId?: string;
      triggerEvent?: string;
    },
  ) {
    try {
      const result = await this.whatsAppService.sendTemplateMessage({
        ...payload,
        messageType: MessageType.TEMPLATE,
      });

      return {
        success: true,
        messageId: result._id,
        whatsAppMessageId: result.whatsAppMessageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send template message: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send interactive button message
   * POST /whatsapp/send/interactive
   */
  @Post("send/interactive")
  async sendInteractiveMessage(
    @Body()
    payload: {
      phoneNumber: string;
      text: string;
      buttons: Array<{ id: string; title: string; payload: string }>;
      userId?: string;
      triggerEvent?: string;
    },
  ) {
    try {
      const result = await this.whatsAppService.sendInteractiveButtonMessage({
        ...payload,
        messageType: MessageType.INTERACTIVE_BUTTON,
        buttonPayloads: payload.buttons,
      });

      return { success: true, messageId: result._id };
    } catch (error) {
      this.logger.error(
        `Failed to send interactive message: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  @Post("send/list")
  async sendListMessage(
    @Body()
    payload: {
      phoneNumber: string;
      text: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
      userId?: string;
    },
  ) {
    try {
      const result = await this.whatsAppService.sendListMessage(
        payload.phoneNumber,
        payload.text,
        payload.buttonText,
        payload.sections,
      );
      return { success: true, messageId: result._id };
    } catch (error) {
      this.logger.error(`Failed to send list message: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send location message
   * POST /whatsapp/send/location
   */
  @Post("send/location")
  async sendLocationMessage(
    @Body()
    payload: {
      phoneNumber: string;
      latitude: number;
      longitude: number;
      name: string;
      userId?: string;
    },
  ) {
    try {
      const result = await this.whatsAppService.sendLocationMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.LOCATION,
        location: {
          latitude: payload.latitude,
          longitude: payload.longitude,
          name: payload.name,
        },
        userId: payload.userId,
      });

      return { success: true, messageId: result._id };
    } catch (error) {
      this.logger.error(
        `Failed to send location message: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send document message
   * POST /whatsapp/send/document
   */
  @Post("send/document")
  async sendDocumentMessage(
    @Body()
    payload: {
      phoneNumber: string;
      documentUrl: string;
      fileName: string;
      userId?: string;
    },
  ) {
    try {
      const result = await this.whatsAppService.sendDocumentMessage(
        payload.phoneNumber,
        payload.documentUrl,
        payload.fileName,
        payload.userId,
      );

      return { success: true, messageId: result._id };
    } catch (error) {
      this.logger.error(
        `Failed to send document message: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send OTP message
   * POST /whatsapp/send/otp
   */
  @Post("send/otp")
  async sendOTPMessage(
    @Body() payload: { phoneNumber: string; otp: string; userId?: string },
  ) {
    try {
      const result = await this.whatsAppService.sendOTPMessage(
        payload.phoneNumber,
        payload.otp,
        payload.userId,
      );

      return { success: true, messageId: result._id };
    } catch (error) {
      this.logger.error(`Failed to send OTP: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Emit WhatsApp event for async processing
   * POST /whatsapp/emit-event
   */
  @Post("emit-event")
  async emitEvent(@Body() payload: WhatsAppEventPayload) {
    try {
      await this.eventService.emitWhatsAppEvent(payload);
      return {
        success: true,
        message: `Event ${payload.type} queued for processing`,
      };
    } catch (error) {
      this.logger.error(`Failed to emit event: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get message logs
   * GET /whatsapp/messages?userId=xxx&status=SENT&limit=50&offset=0
   */
  @Get("messages")
  async getMessages(
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Query("limit") limit: number = 50,
    @Query("offset") offset: number = 0,
  ) {
    try {
      const filters: any = {};
      if (userId) filters.userId = userId;
      if (status) filters.status = status;

      const messages = await this.whatsAppService.getMessageLogs(
        filters,
        limit,
        offset,
      );

      return {
        success: true,
        data: messages,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch messages: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get webhook events
   * GET /whatsapp/webhook-events?eventType=MESSAGE_STATUS&limit=50
   */
  @Get("webhook-events")
  async getWebhookEvents(
    @Query("eventType") eventType?: string,
    @Query("limit") limit: number = 50,
    @Query("offset") offset: number = 0,
  ) {
    try {
      const filters: any = {};
      if (eventType) filters.eventType = eventType;

      const { events, total } = await this.webhookService.getWebhookEvents(
        filters,
        limit,
        offset,
      );

      return {
        success: true,
        data: events,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch webhook events: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retry failed webhook event
   * POST /whatsapp/webhook-events/:eventId/retry
   */
  @Post("webhook-events/:eventId/retry")
  async retryWebhookEvent(@Param("eventId") eventId: string) {
    try {
      await this.webhookService.retryWebhookEvent(eventId);
      return { success: true, message: `Webhook event ${eventId} retried` };
    } catch (error) {
      this.logger.error(
        `Failed to retry webhook event: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Queue message for later delivery
   * POST /whatsapp/queue
   */
  @Post("queue")
  async queueMessage(
    @Body()
    payload: {
      phoneNumber: string;
      templateName: string;
      variables?: Record<string, any>;
      delayMs?: number;
    },
  ) {
    try {
      const job = await this.whatsAppService.queueMessage(
        {
          phoneNumber: payload.phoneNumber,
          messageType: MessageType.TEMPLATE,
          templateName: payload.templateName,
          variables: payload.variables,
        },
        payload.delayMs,
      );

      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to queue message: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get event statistics
   * GET /whatsapp/events/stats
   */
  @Get("events/stats")
  async getEventStats() {
    try {
      const stats = await this.eventService.getEventStatistics();
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error(`Failed to get event stats: ${error.message}`, error);
      throw error;
    }
  }
}
