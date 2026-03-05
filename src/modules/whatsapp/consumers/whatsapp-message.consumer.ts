/**
 * WhatsApp Message Queue Consumer
 * File: src/modules/whatsapp/consumers/whatsapp-message.consumer.ts
 */

import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import { WhatsAppService } from "../services/whatsapp.service";

@Processor("whatsapp-messages")
export class WhatsAppMessageConsumer {
  private readonly logger = new Logger(WhatsAppMessageConsumer.name);

  constructor(private whatsAppService: WhatsAppService) {}

  /**
   * Process queued message jobs
   */
  @Process()
  async processMessage(job: Job<any>) {
    try {
      this.logger.log(`Processing message job ${job.id}`);

      const {
        phoneNumber,
        messageType,
        templateName,
        variables,
        userId,
        leadId,
        triggerEvent,
      } = job.data;

      // Send the message
      const result = await this.whatsAppService.sendTemplateMessage({
        phoneNumber,
        messageType,
        templateName,
        variables,
        userId,
        leadId,
        triggerEvent,
      });

      this.logger.log(`Message job ${job.id} completed: ${result._id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process message job ${job.id}: ${error.message}`,
        error,
      );
      throw error; // Retry the job
    }
  }

  /**
   * Handle job completion
   */
  @Process({ name: "completed" })
  onCompleted(job: Job) {
    this.logger.log(`Message job ${job.id} completed successfully`);
  }

  /**
   * Handle job failure
   */
  @Process({ name: "failed" })
  onFailed(job: Job) {
    this.logger.error(`Message job ${job.id} failed`);
  }
}
