import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";
import { WhatsAppService } from "../services/whatsapp.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  WhatsAppBroadcast,
  WhatsAppBroadcastDocument,
} from "../schemas/whatsapp-broadcast.schema";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";
import { MessageType } from "../schemas/whatsapp-message-log.schema";

@Processor("whatsapp-broadcasts")
export class WhatsAppBroadcastConsumer {
  private readonly logger = new Logger(WhatsAppBroadcastConsumer.name);

  constructor(
    private whatsAppService: WhatsAppService,
    @InjectModel(WhatsAppBroadcast.name)
    private broadcastModel: Model<WhatsAppBroadcastDocument>,
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
  ) {}

  @Process("send-broadcast")
  async sendBroadcast(job: Job<{ broadcastId: string; batchSize?: number }>) {
    const { broadcastId, batchSize = 50 } = job.data;
    this.logger.log(`Processing broadcast job for ${broadcastId}`);

    try {
      const broadcast = await this.broadcastModel.findById(broadcastId);
      if (
        !broadcast ||
        (broadcast.status !== "Scheduled" && broadcast.status !== "Processing")
      ) {
        this.logger.warn(
          `Broadcast ${broadcastId} not found or not in valid state`,
        );
        return;
      }

      const settings = await this.settingsModel.findOne({ isActive: true });
      const rateLimit = settings?.rateLimitConfig?.requestsPerSecond || 80;
      // Calculate delay between batches to stay under rate limit
      // e.g. 50 msgs / 80 rps = 0.625s minimum. We add safety margin.
      const delayPerBatch = Math.ceil((batchSize / rateLimit) * 1000 * 1.5); // 1.5x safety factor

      // Update status to Processing
      if (broadcast.status === "Scheduled") {
        broadcast.status = "Processing";
        broadcast.startedAt = new Date();
        await broadcast.save();
      }

      // Fetch recipients (this logic would be more complex in real app, fetching from Leads/Patients)
      // For now assuming recipients are stored or we fetch based on tags
      const recipients = await this.fetchRecipients(broadcast);

      let sentCount = broadcast.stats.sent;
      let failedCount = broadcast.stats.failed;

      // Process in batches
      for (
        let i = sentCount + failedCount;
        i < recipients.length;
        i += batchSize
      ) {
        // Check if broadcast was cancelled
        const freshBroadcast = await this.broadcastModel.findById(broadcastId);
        if (freshBroadcast?.status === "Cancelled") {
          this.logger.log(`Broadcast ${broadcastId} was cancelled`);
          return;
        }

        const batch = recipients.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (recipient) => {
            try {
              await this.whatsAppService.sendTemplateMessage({
                phoneNumber: recipient.phoneNumber,
                messageType: MessageType.TEMPLATE,
                templateName: broadcast.templateName,
                variables: this.mapVariables(broadcast.variables, recipient),
                campaignId: broadcastId,
              });
              sentCount++;
            } catch (error) {
              this.logger.error(
                `Failed to send to ${recipient.phoneNumber}: ${error.message}`,
              );
              failedCount++;
            }
          }),
        );

        // Update stats progressively
        await this.broadcastModel.updateOne(
          { _id: broadcastId },
          {
            "stats.sent": sentCount,
            "stats.failed": failedCount,
            progress: Math.round(
              ((sentCount + failedCount) / recipients.length) * 100,
            ),
          },
        );

        // Intelligent Rate limiting pause
        await new Promise((resolve) => setTimeout(resolve, delayPerBatch));
      }

      // Final update
      await this.broadcastModel.updateOne(
        { _id: broadcastId },
        {
          status: "Completed",
          completedAt: new Date(),
          progress: 100,
        },
      );

      this.logger.log(`Broadcast ${broadcastId} completed`);
    } catch (error) {
      this.logger.error(`Broadcast job failed: ${error.message}`, error);
      await this.broadcastModel.updateOne(
        { _id: broadcastId },
        { status: "Failed" },
      );
      throw error;
    }
  }

  private async fetchRecipients(broadcast: WhatsAppBroadcastDocument) {
    // Mock implementation - in real app, query Contacts/Leads based on broadcast.tags / broadcast.segments
    return [{ phoneNumber: "919876543210", name: "Test User" }];
  }

  private mapVariables(variables: any[], recipient: any) {
    // Map template variables to recipient data
    const mapped: any = {};
    if (variables) {
      variables.forEach((v) => {
        // simple mapping logic
        if (v.dataSource === "name") mapped[v.variableName] = recipient.name;
      });
    }
    return mapped;
  }
}
