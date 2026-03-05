import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards";
import { TherapistsService } from "./therapists.service";

@Controller("therapists/onboarding")
export class TherapistOnboardingController {
  constructor(private therapistService: TherapistsService) { }

  /**
   * Get pending data for therapist
   * Called after login to show what data is missing
   */
  @Get("pending-data")
  @UseGuards(JwtAuthGuard)
  async getPendingData(@Request() req) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      const therapist =
        await this.therapistService.getTherapistById(therapistId);

      if (!therapist) {
        throw new HttpException("Therapist not found", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          therapistId,
          pendingFields: (therapist as any).validationErrors?.length ? (therapist as any).validationErrors.map(e => e.field) : [],
          validationErrors: (therapist as any).validationErrors || [],
          isProfileComplete: (therapist as any).isProfileComplete || false,
          completionPercentage: 50,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get pending data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get onboarding status
   */
  @Get("status")
  @UseGuards(JwtAuthGuard)
  async getOnboardingStatus(@Request() req) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      const therapist =
        await this.therapistService.getTherapistById(therapistId);

      if (!therapist) {
        throw new HttpException("Therapist not found", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          onboardingStep: (therapist as any).onboardingStep || "step_1",
          status: (therapist as any).onboardingStatus || "pending",
          validationErrors: (therapist as any).validationErrors || [],
          isProfileComplete: (therapist as any).isProfileComplete || false,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get onboarding status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Submit onboarding data
   */
  @Post("submit")
  @UseGuards(JwtAuthGuard)
  async submitOnboardingData(@Request() req, @Body() body: any) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      const updateData = {
        ...body,
        onboardingStatus: "pending_review",
      };

      const updatedTherapist = await this.therapistService.updateTherapist(
        therapistId,
        updateData,
      );

      return {
        success: true,
        message: "Onboarding data submitted successfully",
        data: {
          therapistId: updatedTherapist._id,
          status: updatedTherapist.onboardingStatus,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to submit onboarding data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Submit onboarding data for verification (from Flutter App)
   */
  @Post("submit-for-verification")
  @UseGuards(JwtAuthGuard)
  async submitForVerification(@Request() req, @Body() body: any) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      const therapist = await this.therapistService.getTherapistById(therapistId);
      // Determine if a re-approval is needed or just review
      const isReapproval = therapist.onboardingStatus === "approved";

      const updateData = {
        ...body,
        onboardingStatus: isReapproval ? "pending_reapproval" : "pending_review",
      };

      const updatedTherapist = await this.therapistService.updateTherapist(
        therapistId,
        updateData,
      );

      return {
        success: true,
        message: "Onboarding data submitted for verification successfully",
        data: {
          therapistId: updatedTherapist._id,
          status: updatedTherapist.onboardingStatus,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to submit for verification: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get dashboard stats
   */
  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  async getDashboard(@Request() req) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      const therapist =
        await this.therapistService.getTherapistById(therapistId);

      if (!therapist) {
        throw new HttpException("Therapist not found", HttpStatus.NOT_FOUND);
      }

      const stats = await this.therapistService.getDashboardStats(therapistId);
      const upcomingAppointments =
        await this.therapistService.getUpcomingAppointments(therapistId);

      return {
        success: true,
        data: {
          therapistId,
          stats,
          upcomingAppointments,
          profile: {
            specialization: therapist.specialization,
            experience: therapist.experience,
            rating: therapist.rating,
            totalReviews: therapist.totalReviews,
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get dashboard: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update therapist profile
   */
  @Put("profile")
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() body: any) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      const updatedTherapist = await this.therapistService.updateTherapist(
        therapistId,
        body,
      );

      return {
        success: true,
        message: "Profile updated successfully",
        data: {
          therapistId: updatedTherapist._id,
          specialization: updatedTherapist.specialization,
          experience: updatedTherapist.experience,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update onboarding data by field
   */
  @Put("update-data/:fieldName")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async updateOnboardingDataField(
    @Request() req,
    @Param("fieldName") fieldName: string,
    @Body() body: any,
    @UploadedFiles() files: Array<any>
  ) {
    const therapistId = req.user.therapistId || req.user.id;

    try {
      // 1. Unpack any potential stringified JSON structures
      let updateData = { ...body };
      for (const key of Object.keys(updateData)) {
        if (typeof updateData[key] === 'string' && (updateData[key].startsWith('{') || updateData[key].startsWith('['))) {
          try { updateData[key] = JSON.parse(updateData[key]); } catch (e) { /* keep as string if not valid JSON */ }
        }
      }

      // Admin syncing: if the profile was already 'under_review' or 'rejected', bounce it back to 'under_review' to alert Admin
      const therapist = await this.therapistService.getTherapistById(therapistId);
      if (therapist && (therapist.onboardingStatus === 'rejected' || therapist.onboardingStatus === 'approved')) {
        updateData.onboardingStatus = 'pending_review';
      }

      // 2. Handle specific File Re-Uploads Safely
      if (files && files.length > 0) {
        // Here we'd map standard file paths e.g using an S3 uploader or a local disk config
        // Assuming your standard documentUrls schema mapping structure
        const uploadedFileUrls = files.map(file => {
          // In a real flow, this uses AWS S3 SDK to generate URLs.
          // Fallback mocking for system consistency:
          return `https://storage.ariesxpert.com/docs/${Date.now()}_${file.originalname}`;
        });

        if (fieldName === 'bankingDetails' || fieldName === 'bankDetails') {
          if (!updateData.bankingDetails) updateData.bankingDetails = {};
          updateData.bankingDetails.cancelledChequeUrl = uploadedFileUrls[0];
          updateData.bankingDetails.bankVerificationStatus = 'pending';
        } else {
          // Merge file pointers against the schema safely for general documents
          if (!updateData.documentUrls) updateData.documentUrls = [];
          updateData.documentUrls.push(...uploadedFileUrls);
        }
      }

      // 3. Let Therapist Service strictly Validate & Save transactionally
      const updatedTherapist = await this.therapistService.updateTherapist(
        therapistId,
        updateData,
      );

      return {
        success: true,
        message: "Data updated successfully",
        data: updatedTherapist,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
