/**
 * WhatsApp Webhook Queue Consumer
 * File: src/modules/whatsapp/consumers/whatsapp-webhook.consumer.ts
 */

import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import { WhatsAppWebhookService } from "../services/whatsapp-webhook.service";

@Processor("whatsapp-webhooks")
export class WhatsAppWebhookConsumer {
  private readonly logger = new Logger(WhatsAppWebhookConsumer.name);

  constructor(private webhookService: WhatsAppWebhookService) {}

  /**
   * Process webhook events from queue
   */
  @Process()
  async processWebhook(job: Job<any>) {
    try {
      this.logger.log(`Processing webhook job ${job.id}`);

      const { eventType, payload } = job.data;

      // Route to appropriate handler
      if (eventType === "MESSAGE_STATUS") {
        await this.webhookService.handleStatusUpdate(payload);
      } else if (eventType === "MESSAGE_RECEIVED") {
        await this.webhookService.handleIncomingMessage(payload);
      }

      this.logger.log(`Webhook job ${job.id} completed`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to process webhook job ${job.id}: ${error.message}`,
        error,
      );
      throw error; // Retry the job
    }
  }
}
