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
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";
import {
  WhatsAppNumber,
  WhatsAppNumberDocument,
} from "../schemas/whatsapp-number.schema";
import {
  WhatsAppContact,
  WhatsAppContactDocument,
} from "../schemas/whatsapp-contact.schema";
import {
  WhatsAppMessageLog,
  WhatsAppMessageLogDocument,
  MessageType,
  MessageStatus,
} from "../schemas/whatsapp-message-log.schema";
import {
  WhatsAppTemplate,
  WhatsAppTemplateDocument,
  TemplateStatus,
} from "../schemas/whatsapp-template.schema";

export interface SendMessagePayload {
  phoneNumber: string;
  fromPhoneNumber?: string;
  messageType: MessageType;
  text?: string;
  templateName?: string;
  variables?: Record<string, any>;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaId?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  buttonPayloads?: any[];
  userId?: string;
  leadId?: string;
  patientId?: string;
  appointmentId?: string;
  transactionId?: string;
  triggerEvent?: string;
  campaignId?: string;
}

interface WhatsAppAPIResponse {
  messages: [{ id: string }];
  contacts: [{ wa_id: string }];
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private settings: WhatsAppSettingsDocument;

  constructor(
    @InjectModel(WhatsAppSettings.name)
    private whatsAppSettingsModel: Model<WhatsAppSettingsDocument>,
    @InjectModel(WhatsAppNumber.name)
    private whatsAppNumberModel: Model<WhatsAppNumberDocument>,
    @InjectModel(WhatsAppContact.name)
    private whatsAppContactModel: Model<WhatsAppContactDocument>,
    @InjectModel(WhatsAppMessageLog.name)
    private messageLogModel: Model<WhatsAppMessageLogDocument>,
    @InjectModel(WhatsAppTemplate.name)
    private templateModel: Model<WhatsAppTemplateDocument>,
    private readonly httpService: HttpService,
  ) {
    this.refreshSettings();
  }

  async onModuleInit() {
    await this.refreshSettings();
  }

  async refreshSettings() {
    this.settings = await this.whatsAppSettingsModel.findOne().exec();
  }

  private sanitizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  private buildTemplateMessagePayload(
    phone: string,
    template: any,
    variables: any,
  ) {
    return {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: template.templateName,
        language: { code: template.language || "en" },
        components: [
          {
            type: "body",
            parameters: Object.keys(variables || {}).map((key) => ({
              type: "text",
              text: String(variables[key]),
            })),
          },
        ],
      },
    };
  }

  private async checkRateLimits() {
    return true;
  }

  private renderTemplate(text: string, variables: any): string {
    let rendered = text;
    if (variables) {
      for (const key in variables) {
        rendered = rendered.replace(
          new RegExp(`{{${key}}}`, "g"),
          String(variables[key]),
        );
      }
    }
    return rendered;
  }

  async sendTemplateMessage(payload: SendMessagePayload) {
    // Alias for simple calls
    return this.processTemplateMessage(payload);
  }

  async sendSimpleTemplateMessage(
    phoneNumber: string,
    templateName: string,
    variables: any,
    buttonPayloads?: any[],
  ) {
    return this.processTemplateMessage({
      phoneNumber,
      messageType: MessageType.TEMPLATE,
      templateName,
      variables,
      buttonPayloads,
    });
  }

  async sendDocumentMessage(
    phoneNumber: string,
    documentUrl: string,
    fileName: string,
    userId?: string,
  ) {
    return this.sendMediaMessage({
      phoneNumber,
      messageType: MessageType.DOCUMENT,
      mediaUrl: documentUrl,
      text: fileName,
      userId,
    });
  }

  async sendDocument(
    phoneNumber: string,
    documentUrl: string,
    fileName: string,
    caption?: string,
  ) {
    return this.sendMediaMessage({
      phoneNumber,
      messageType: MessageType.DOCUMENT,
      mediaUrl: documentUrl,
      text: fileName,
      mediaCaption: caption,
    });
  }

  async sendOTPMessage(phoneNumber: string, otp: string, userId?: string) {
    return this.sendTextMessage({
      phoneNumber,
      messageType: MessageType.TEXT,
      text: `Your OTP is: ${otp}`,
      userId,
    });
  }

  private async processTemplateMessage(payload: SendMessagePayload) {
    try {
      const sender = await this.resolveSender(payload);
      const phoneNumberId = sender.phoneNumberId;
      const accessToken = sender.accessToken;

      if (!phoneNumberId || !accessToken) {
        throw new InternalServerErrorException(
          "WhatsApp configuration missing credentials",
        );
      }

      const sanitizedPhone = this.sanitizePhoneNumber(payload.phoneNumber);

      if (
        this.settings?.respectDND &&
        this.settings?.optOutNumbers?.includes(sanitizedPhone)
      ) {
        throw new BadRequestException(
          "Number is opted out from WhatsApp messages",
        );
      }

      if (!payload.templateName) {
        throw new BadRequestException("Template name is required");
      }

      const template = await this.templateModel.findOne({
        templateName: payload.templateName,
        approvalStatus: TemplateStatus.APPROVED,
        isActive: true,
      });

      if (!template) {
        throw new BadRequestException(
          `Template not found or not approved: ${payload.templateName}`,
        );
      }

      const messagePayload = this.buildTemplateMessagePayload(
        sanitizedPhone,
        template,
        payload.variables,
      );

      await this.checkRateLimits();

      const response = await this.callWhatsAppAPI("messages", messagePayload, {
        phoneNumberId,
        accessToken,
      });

      const messageLog = await this.messageLogModel.create({
        whatsAppMessageId: response.messages[0].id,
        recipientPhoneNumber: sanitizedPhone,
        senderPhoneNumber: (sender as any).phoneNumber || phoneNumberId,
        messageType: MessageType.TEMPLATE,
        status: MessageStatus.SENT,
        content: this.renderTemplate(template.bodyText, payload.variables),
        templateId: template._id.toString(),
        templateVariables: payload.variables,
        userId: payload.userId,
        leadId: payload.leadId,
        patientId: payload.patientId,
        appointmentId: payload.appointmentId,
        transactionId: payload.transactionId,
        triggerEvent: payload.triggerEvent,
        campaignId: payload.campaignId,
        whatsAppMetadata: {
          messageId: response.messages[0].id,
          status: "sent",
          timestamp: Date.now(),
        },
        sentAt: new Date(),
      });

      await this.templateModel.updateOne(
        { _id: template._id },
        { $inc: { "analytics.sent": 1 } },
      );

      this.logger.log(
        `Template message sent to ${sanitizedPhone} with ID: ${response.messages[0].id}`,
      );
      return messageLog;
    } catch (error) {
      this.logger.error(
        `Failed to send template message: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  async sendTextMessage(payload: SendMessagePayload) {
    return this.sendGenericMessage(payload, {
      messaging_product: "whatsapp",
      to: this.sanitizePhoneNumber(payload.phoneNumber),
      type: "text",
      text: { body: payload.text },
    });
  }

  async sendMediaMessage(payload: SendMessagePayload) {
    const type = payload.messageType.toLowerCase(); // image, video, document, audio
    const mediaObject: any = {};
    if (payload.mediaId) mediaObject.id = payload.mediaId;
    else if (payload.mediaUrl) mediaObject.link = payload.mediaUrl;
    else throw new BadRequestException("Media URL or ID required");

    if (payload.mediaCaption) mediaObject.caption = payload.mediaCaption;
    if (payload.messageType === MessageType.DOCUMENT && payload.text)
      mediaObject.filename = payload.text;

    return this.sendGenericMessage(payload, {
      messaging_product: "whatsapp",
      to: this.sanitizePhoneNumber(payload.phoneNumber),
      type: type,
      [type]: mediaObject,
    });
  }

  async sendLocationMessage(payload: SendMessagePayload) {
    return this.sendGenericMessage(payload, {
      messaging_product: "whatsapp",
      to: this.sanitizePhoneNumber(payload.phoneNumber),
      type: "location",
      location: {
        latitude: payload.location.latitude,
        longitude: payload.location.longitude,
        name: payload.location.name,
        address: payload.location.address,
      },
    });
  }

  async sendInteractiveButtonMessage(payload: SendMessagePayload) {
    return this.sendGenericMessage(payload, {
      messaging_product: "whatsapp",
      to: this.sanitizePhoneNumber(payload.phoneNumber),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: payload.text },
        action: {
          buttons: payload.buttonPayloads.map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    });
  }

  // Helper for generic sending
  private async sendGenericMessage(
    payload: SendMessagePayload,
    apiPayload: any,
  ) {
    try {
      const sender = await this.resolveSender(payload);
      const phoneNumberId = sender.phoneNumberId;
      const accessToken = sender.accessToken;

      if (!phoneNumberId || !accessToken)
        throw new InternalServerErrorException(
          "WhatsApp configuration missing",
        );

      const sanitizedPhone = this.sanitizePhoneNumber(payload.phoneNumber);
      await this.checkRateLimits();

      const response = await this.callWhatsAppAPI("messages", apiPayload, {
        phoneNumberId,
        accessToken,
      });

      const messageLog = await this.messageLogModel.create({
        whatsAppMessageId: response.messages[0].id,
        recipientPhoneNumber: sanitizedPhone,
        senderPhoneNumber: (sender as any).phoneNumber || phoneNumberId,
        messageType: payload.messageType,
        status: MessageStatus.SENT,
        content: payload.text || "Media/Interactive Message",
        userId: payload.userId,
        leadId: payload.leadId,
        patientId: payload.patientId,
        whatsAppMetadata: {
          messageId: response.messages[0].id,
          status: "sent",
          timestamp: Date.now(),
        },
        sentAt: new Date(),
      });

      this.logger.log(
        `Message (${payload.messageType}) sent to ${sanitizedPhone}`,
      );
      return messageLog;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`, error);
      throw error;
    }
  }

  // Exposed for Controller/Queues
  async queueMessage(payload: any, delayMs: number = 0) {
    // Logic to add to Bull Queue
    // For now just sending directly if delay is 0, or mocking queue return
    if (delayMs === 0) {
      if (payload.messageType === MessageType.TEMPLATE)
        return this.sendTemplateMessage(payload);
      return this.sendTextMessage(payload);
    }
    return { id: "queued_job_id" };
  }

  // Retrieve Logs
  async getMessageLogs(filters: any, limit: number, offset: number) {
    return this.messageLogModel
      .find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
  }

  async sendListMessage(
    phoneNumber: string,
    text: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
  ) {
    return this.sendGenericMessage(
      { phoneNumber, messageType: MessageType.LIST, text },
      {
        messaging_product: "whatsapp",
        to: this.sanitizePhoneNumber(phoneNumber),
        type: "interactive",
        interactive: {
          type: "list",
          body: { text },
          action: {
            button: buttonText,
            sections,
          },
        },
      },
    );
  }

  private async resolveSender(
    payload: SendMessagePayload,
  ): Promise<WhatsAppNumberDocument | WhatsAppSettingsDocument> {
    // 1. Explicit request
    if (payload.fromPhoneNumber) {
      const number = await this.whatsAppNumberModel.findOne({
        phoneNumber: payload.fromPhoneNumber,
        isActive: true,
      });
      if (number) return number;
    }

    // 2. Sticky contact assignment
    const contact = await this.whatsAppContactModel.findOne({
      phoneNumber: this.sanitizePhoneNumber(payload.phoneNumber),
    });
    if (contact?.primaryWhatsAppNumberId) {
      const number = await this.whatsAppNumberModel.findById(
        contact.primaryWhatsAppNumberId,
      );
      if (number && number.isActive) return number;
    }

    // 3. City/Department Routing
    // Check contact attributes first, then payload overrides if passed (not in payload currently but can be extended)
    if (contact?.city) {
      const cityNumber = await this.whatsAppNumberModel.findOne({
        assignedCities: contact.city,
        isActive: true,
      });
      if (cityNumber) return cityNumber;
    }
    // We would need to know the department/service context, but let's assume we look for it in payload in future.

    // 4. Default Fallback
    const defaultNumber = await this.whatsAppNumberModel
      .findOne({ isActive: true })
      .sort({ createdAt: 1 });
    if (defaultNumber) return defaultNumber;

    // 5. Legacy Settings
    if (this.settings?.phoneNumberId) return this.settings;

    throw new InternalServerErrorException(
      "No active WhatsApp number configuration found",
    );
  }

  private async callWhatsAppAPI(
    endpoint: string,
    payload: any,
    config?: { phoneNumberId: string; accessToken: string },
  ): Promise<WhatsAppAPIResponse> {
    try {
      const phoneNumberId =
        config?.phoneNumberId || this.settings?.phoneNumberId;
      const accessToken = config?.accessToken || this.settings?.accessToken;

      if (!this.settings?.apiBaseUrl) {
        // Fallback default
        if (!this.settings) this.settings = {} as any;
        this.settings.apiBaseUrl = "https://graph.facebook.com/v18.0";
      }

      const url = `${this.settings.apiBaseUrl}/${phoneNumberId}/${endpoint}`;

      const response = await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `WhatsApp API Error: ${error.message}`,
        error.response?.data,
      );
      throw error;
    }
  }
}
