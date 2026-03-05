/**
 * WhatsApp Template Controller
 * File: src/modules/whatsapp/controllers/whatsapp-template.controller.ts
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { WhatsAppTemplateService } from "../services/whatsapp-template.service";
import { TemplateStatus } from "../schemas/whatsapp-template.schema";

@Controller("whatsapp/templates")
export class WhatsAppTemplateController {
  private readonly logger = new Logger(WhatsAppTemplateController.name);

  constructor(private templateService: WhatsAppTemplateService) {}

  /**
   * Create new template
   * POST /whatsapp/templates
   */
  @Post()
  async createTemplate(
    @Body()
    dto: {
      templateName: string;
      displayName: string;
      description: string;
      module: string;
      category?: string;
      language?: string;
      headerType?: string;
      headerContent?: string;
      bodyText: string;
      footerText?: string;
      buttons?: any[];
      variables?: any[];
    },
    @Req() req: any,
  ) {
    try {
      const createdBy = req.user?.id || "system";
      const template = await this.templateService.createTemplate(
        {
          ...dto,
          category: (dto.category as any) || "UTILITY",
        },
        createdBy,
      );

      return {
        success: true,
        template,
        message: "Template created successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all templates with filtering
   * GET /whatsapp/templates?module=LEADS&status=APPROVED&limit=50
   */
  @Get()
  async getTemplates(
    @Query("module") module?: string,
    @Query("status") status?: string,
    @Query("language") language?: string,
    @Query("isActive") isActive?: boolean,
    @Query("limit") limit: number = 50,
    @Query("offset") offset: number = 0,
  ) {
    try {
      const filters: any = {};
      if (module) filters.module = module;
      if (status) filters.approvalStatus = status;
      if (language) filters.language = language;
      if (isActive !== undefined) filters.isActive = isActive;

      const { templates, total } = await this.templateService.getTemplates(
        filters,
        limit,
        offset,
      );

      return {
        success: true,
        templates,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch templates: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get template by ID
   * GET /whatsapp/templates/:templateId
   */
  @Get(":templateId")
  async getTemplate(@Param("templateId") templateId: string) {
    try {
      const template = await this.templateService.getTemplate(templateId);

      return {
        success: true,
        template,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update template
   * PUT /whatsapp/templates/:templateId
   */
  @Put(":templateId")
  async updateTemplate(
    @Param("templateId") templateId: string,
    @Body() updateDto: any,
  ) {
    try {
      const template = await this.templateService.updateTemplate(
        templateId,
        updateDto,
      );

      return {
        success: true,
        template,
        message: "Template updated successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Submit template for approval
   * POST /whatsapp/templates/:templateId/submit
   */
  @Post(":templateId/submit")
  async submitForApproval(@Param("templateId") templateId: string) {
    try {
      const template = await this.templateService.submitForApproval(templateId);

      return {
        success: true,
        template,
        message: "Template submitted for WhatsApp approval",
      };
    } catch (error) {
      this.logger.error(`Failed to submit template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Approve template (admin only)
   * POST /whatsapp/templates/:templateId/approve
   */
  @Post(":templateId/approve")
  async approveTemplate(
    @Param("templateId") templateId: string,
    @Req() req: any,
  ) {
    try {
      const approvedBy = req.user?.id || "system";
      const template = await this.templateService.approveTemplate(
        templateId,
        approvedBy,
      );

      return {
        success: true,
        template,
        message: "Template approved",
      };
    } catch (error) {
      this.logger.error(`Failed to approve template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Reject template (admin only)
   * POST /whatsapp/templates/:templateId/reject
   */
  @Post(":templateId/reject")
  async rejectTemplate(
    @Param("templateId") templateId: string,
    @Body() payload: { reason: string },
    @Req() req: any,
  ) {
    try {
      const rejectedBy = req.user?.id || "system";
      const template = await this.templateService.rejectTemplate(
        templateId,
        payload.reason,
        rejectedBy,
      );

      return {
        success: true,
        template,
        message: "Template rejected",
      };
    } catch (error) {
      this.logger.error(`Failed to reject template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete template
   * DELETE /whatsapp/templates/:templateId
   */
  @Delete(":templateId")
  async deleteTemplate(@Param("templateId") templateId: string) {
    try {
      await this.templateService.deleteTemplate(templateId);

      return {
        success: true,
        message: "Template deleted successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to delete template: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get template analytics
   * GET /whatsapp/templates/:templateId/analytics
   */
  @Get(":templateId/analytics")
  async getTemplateAnalytics(@Param("templateId") templateId: string) {
    try {
      const analytics =
        await this.templateService.getTemplateAnalytics(templateId);

      return {
        success: true,
        analytics,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch analytics: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get templates by module
   * GET /whatsapp/templates/module/:module
   */
  @Get("module/:module")
  async getTemplatesByModule(@Param("module") module: string) {
    try {
      const templates = await this.templateService.getTemplatesByModule(module);

      return {
        success: true,
        templates,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch module templates: ${error.message}`,
        error,
      );
      throw error;
    }
  }
}
