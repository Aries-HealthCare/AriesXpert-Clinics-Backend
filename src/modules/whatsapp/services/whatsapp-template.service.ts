/**
 * WhatsApp Template Service
 * File: src/modules/whatsapp/services/whatsapp-template.service.ts
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";

import {
  WhatsAppTemplate,
  WhatsAppTemplateDocument,
  TemplateStatus,
  TemplateCategory,
} from "../schemas/whatsapp-template.schema";
import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";

interface CreateTemplateDTO {
  templateName: string;
  displayName: string;
  description: string;
  module: string;
  category?: TemplateCategory;
  language?: string;
  headerType?: string;
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: any[];
  variables?: any[];
}

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(
    @InjectModel(WhatsAppTemplate.name)
    private templateModel: Model<WhatsAppTemplateDocument>,
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Sync templates from Meta
   */
  async syncTemplates() {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });
      if (!settings || !settings.businessAccountId || !settings.accessToken) {
        throw new Error("WhatsApp settings not configured");
      }

      this.logger.log("Syncing templates from Meta...");

      const url = `${settings.apiBaseUrl}/${settings.businessAccountId}/message_templates`;
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: settings.accessToken,
            limit: 100,
          },
        }),
      );

      const templates = response.data.data;

      for (const t of templates) {
        await this.templateModel.findOneAndUpdate(
          { templateName: t.name, language: t.language },
          {
            templateName: t.name,
            displayName: t.name.replace(/_/g, " "),
            description: "Synced from Meta",
            category: t.category,
            language: t.language,
            bodyText:
              t.components.find((c: any) => c.type === "BODY")?.text || "",
            headerType:
              t.components.find((c: any) => c.type === "HEADER")?.format ||
              "NONE",
            footerText:
              t.components.find((c: any) => c.type === "FOOTER")?.text || null,
            buttons:
              t.components.find((c: any) => c.type === "BUTTONS")?.buttons ||
              [],
            approvalStatus: t.status,
            whatsAppTemplateId: t.id,
            lastSyncedAt: new Date(),
            module: "BROADCAST", // Default module
          },
          { upsert: true, new: true },
        );
      }

      this.logger.log(`Synced ${templates.length} templates successfully`);
      return { success: true, count: templates.length };
    } catch (error) {
      this.logger.error(`Failed to sync templates: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create template (for local storage only, approval required)
   */
  async createTemplate(
    dto: CreateTemplateDTO,
    createdBy: string,
  ): Promise<WhatsAppTemplateDocument> {
    try {
      // Check if template name already exists
      const existing = await this.templateModel.findOne({
        templateName: dto.templateName,
      });
      if (existing) {
        throw new BadRequestException(
          `Template with name '${dto.templateName}' already exists`,
        );
      }

      const template = await this.templateModel.create({
        ...dto,
        createdBy,
        approvalStatus: TemplateStatus.PENDING_APPROVAL,
      });

      this.logger.log(`Template created: ${dto.templateName}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all templates with filtering
   */
  async getTemplates(
    filters: {
      module?: string;
      approvalStatus?: TemplateStatus;
      language?: string;
      isActive?: boolean;
    } = {},
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ templates: WhatsAppTemplateDocument[]; total: number }> {
    try {
      const query = this.templateModel.find(filters);
      const total = await query.countDocuments();
      const templates = await query
        .limit(limit)
        .skip(offset)
        .sort({ createdAt: -1 });

      return { templates, total };
    } catch (error) {
      this.logger.error(`Failed to fetch templates: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get single template
   */
  async getTemplate(templateId: string): Promise<WhatsAppTemplateDocument> {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }
      return template;
    } catch (error) {
      this.logger.error(`Failed to fetch template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update template (only if pending approval or rejected)
   */
  async updateTemplate(
    templateId: string,
    updateDto: Partial<CreateTemplateDTO>,
  ): Promise<WhatsAppTemplateDocument> {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }

      if (template.approvalStatus === TemplateStatus.APPROVED) {
        throw new BadRequestException("Cannot update approved templates");
      }

      const updated = await this.templateModel.findByIdAndUpdate(
        templateId,
        updateDto,
        { new: true },
      );
      this.logger.log(`Template updated: ${templateId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Submit template to WhatsApp for approval
   */
  async submitForApproval(
    templateId: string,
  ): Promise<WhatsAppTemplateDocument> {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }

      if (template.approvalStatus === TemplateStatus.APPROVED) {
        throw new BadRequestException("Template is already approved");
      }

      if (template.approvalStatus === TemplateStatus.PENDING_APPROVAL) {
        this.logger.log(`Template already pending: ${templateId}`);
        return template;
      }

      // Call WhatsApp API to create template
      const whatsAppTemplateId = await this.createWhatsAppTemplate(template);

      // Update with WhatsApp ID and status
      const updated = await this.templateModel.findByIdAndUpdate(
        templateId,
        {
          whatsAppTemplateId,
          approvalStatus: TemplateStatus.PENDING_APPROVAL,
        },
        { new: true },
      );

      this.logger.log(`Template submitted for approval: ${templateId}`);
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to submit template for approval: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Approve template (admin only)
   */
  async approveTemplate(
    templateId: string,
    approvedBy: string,
  ): Promise<WhatsAppTemplateDocument> {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }

      const updated = await this.templateModel.findByIdAndUpdate(
        templateId,
        {
          approvalStatus: TemplateStatus.APPROVED,
          approvedBy,
          approvedAt: new Date(),
        },
        { new: true },
      );

      this.logger.log(`Template approved: ${templateId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to approve template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Reject template (admin only)
   */
  async rejectTemplate(
    templateId: string,
    reason: string,
    rejectedBy: string,
  ): Promise<WhatsAppTemplateDocument> {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }

      const updated = await this.templateModel.findByIdAndUpdate(
        templateId,
        {
          approvalStatus: TemplateStatus.REJECTED,
          approvalReason: reason,
          rejectedBy,
          rejectedAt: new Date(),
        },
        { new: true },
      );

      this.logger.log(`Template rejected: ${templateId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to reject template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete template (only if not approved)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }

      if (template.isSystem) {
        throw new BadRequestException("System templates cannot be deleted");
      }

      if (template.approvalStatus === TemplateStatus.APPROVED) {
        throw new BadRequestException("Cannot delete approved templates");
      }

      await this.templateModel.findByIdAndDelete(templateId);
      this.logger.log(`Template deleted: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(templateId: string) {
    try {
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        throw new NotFoundException(`Template not found: ${templateId}`);
      }

      return template.analytics;
    } catch (error) {
      this.logger.error(`Failed to fetch analytics: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get default templates by module
   */
  async getTemplatesByModule(
    module: string,
  ): Promise<WhatsAppTemplateDocument[]> {
    try {
      return this.templateModel.find({
        module,
        approvalStatus: TemplateStatus.APPROVED,
        isActive: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch module templates: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async createWhatsAppTemplate(
    template: WhatsAppTemplateDocument,
  ): Promise<string> {
    try {
      const settings = await this.settingsModel.findOne({ isActive: true });
      if (!settings) {
        throw new Error("WhatsApp settings not configured");
      }

      const payload = {
        name: template.templateName,
        language: template.language,
        category: template.category || "UTILITY",
        components: this.buildComponents(template),
      };

      const url = `${settings.apiBaseUrl}/${settings.businessAccountId}/message_templates`;

      const response = await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            "Content-Type": "application/json",
          },
        }),
      );

      return ((response as any).data as any).id;
    } catch (error) {
      this.logger.error(
        `Failed to create WhatsApp template: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  private buildComponents(template: WhatsAppTemplateDocument) {
    const components = [];

    // Header component
    if (template.headerType && template.headerType !== "NONE") {
      components.push({
        type: "HEADER",
        format: template.headerType,
      });
    }

    // Body component
    components.push({
      type: "BODY",
      text: template.bodyText,
    });

    // Footer component
    if (template.footerText) {
      components.push({
        type: "FOOTER",
        text: template.footerText,
      });
    }

    // Buttons component
    if (template.buttons && template.buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: template.buttons.map((btn) => ({
          type: btn.type,
          text: btn.text,
          url: btn.url,
          phone_number: btn.phoneNumber,
        })),
      });
    }

    return components;
  }
}
