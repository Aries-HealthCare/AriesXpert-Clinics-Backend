import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AssessmentForm } from "./assessment-form.model";

@Injectable()
export class AssessmentFormService {
  constructor(
    @InjectModel(AssessmentForm.name)
    private assessmentFormModel: Model<AssessmentForm>,
  ) {}

  /**
   * Create assessment form (Admin use)
   */
  async createForm(
    data: any,
    createdBy: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const form = await this.assessmentFormModel.create({
        ...data,
        createdBy: new Types.ObjectId(createdBy),
        version: 1,
      });

      return {
        success: true,
        data: form,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update assessment form
   */
  async updateForm(
    formId: string,
    data: any,
    updatedBy: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const form = await this.assessmentFormModel.findByIdAndUpdate(
        formId,
        {
          ...data,
          updatedBy: new Types.ObjectId(updatedBy),
          $inc: { version: 1 },
        },
        { new: true },
      );

      return {
        success: true,
        data: form,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get form by ID
   */
  async getFormById(formId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const form = await this.assessmentFormModel.findById(formId);

      if (!form) {
        return {
          success: false,
          error: "Form not found",
        };
      }

      return {
        success: true,
        data: form,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get forms by treatment type (For mobile app)
   */
  async getFormsByTreatmentType(treatmentTypeId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const forms = await this.assessmentFormModel.find({
        treatmentType: new Types.ObjectId(treatmentTypeId),
        isDeleted: false,
        isActive: true,
      });

      return {
        success: true,
        data: forms,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get form by treatment type and visit type
   */
  async getFormByTreatmentAndVisitType(
    treatmentTypeId: string,
    visitType: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const form = await this.assessmentFormModel.findOne({
        treatmentType: new Types.ObjectId(treatmentTypeId),
        visitType,
        isDeleted: false,
        isActive: true,
      });

      if (!form) {
        return {
          success: false,
          error: "Form not found for this treatment and visit type",
        };
      }

      return {
        success: true,
        data: form,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all active forms (Admin)
   */
  async getAllForms(filter?: any): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const query = {
        isDeleted: false,
        ...filter,
      };

      const forms = await this.assessmentFormModel
        .find(query)
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: forms,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete form (soft delete)
   */
  async deleteForm(formId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const form = await this.assessmentFormModel.findByIdAndUpdate(
        formId,
        {
          isDeleted: true,
          isActive: false,
        },
        { new: true },
      );

      return {
        success: true,
        data: form,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Archive form
   */
  async archiveForm(formId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const form = await this.assessmentFormModel.findByIdAndUpdate(
        formId,
        {
          status: "archived",
          isActive: false,
        },
        { new: true },
      );

      return {
        success: true,
        data: form,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
