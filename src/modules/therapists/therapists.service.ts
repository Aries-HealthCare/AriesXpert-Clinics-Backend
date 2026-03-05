import { Injectable, BadRequestException, Logger, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Therapist, TherapistDocument } from "./schemas/therapist.schema";
import { TherapistAuditLog } from "./schemas/therapist-audit-log.schema";
import { TherapistFinancialAdjustment } from "./schemas/therapist-financial-adjustment.schema";
import { TherapistFraudLog } from "./schemas/therapist-fraud-log.schema";
import { TherapistNotification } from "./schemas/therapist-notification.schema";
import { Ledger, LedgerCategory, LedgerStatus } from "../finance/schemas/ledger.schema";
import { Visit } from "../visits/schemas/visit.schema";
import { UsersService } from "../users/users.service";
import { startOfMonth, endOfMonth } from "date-fns";
import { JwtService } from "@nestjs/jwt";
import { ReferralsService } from "../referrals/referrals.service";
import { ReferralType } from "../referrals/schemas/referral.schema";
import { EmailService } from "../email/email.service";

@Injectable()
export class TherapistsService {
  private readonly logger = new Logger(TherapistsService.name);

  constructor(
    @InjectModel(Therapist.name)
    private therapistModel: Model<TherapistDocument>,
    @InjectModel("Expert")
    private expertModel: Model<any>,
    @InjectModel("TherapistLegacy")
    private therapistLegacyModel: Model<any>,
    @InjectModel(TherapistAuditLog.name)
    private auditLogModel: Model<TherapistAuditLog>,
    @InjectModel(TherapistFinancialAdjustment.name)
    private financialAdjustmentModel: Model<TherapistFinancialAdjustment>,
    @InjectModel(TherapistFraudLog.name)
    private fraudLogModel: Model<TherapistFraudLog>,
    @InjectModel(TherapistNotification.name)
    private notificationModel: Model<TherapistNotification>,
    @InjectModel(Ledger.name)
    private ledgerModel: Model<Ledger>,
    @InjectModel(Visit.name)
    private visitModel: Model<Visit>,
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    @Inject(forwardRef(() => ReferralsService))
    private referralsService: ReferralsService,
    private emailService: EmailService,
  ) { }

  async create(createTherapistDto: any) {
    return this.therapistModel.create(createTherapistDto);
  }

  /**
   * Onboard a new therapist.
   * C3-FIX: authenticatedUserId is now required so submission is always linked to
   *         the verified JWT user, not the submitted email (which could be spoofed).
   * C1-FIX: identityDetails no longer accessed — PAN/Aadhar come from bankingDetails.fields
   *         and personalDetails safely, avoiding the undefined-property crash.
   * H2-FIX: onboardingStatus is explicitly set to 'pending' on every submission so the
   *         mobile status page always renders the Under Review screen correctly.
   */
  async onboard(data: any, authenticatedUserId?: string) {
    if (!data?.personalDetails?.email) {
      throw new BadRequestException("Email is required for onboarding");
    }

    this.logger.log(`Starting onboarding for: ${data.personalDetails.email}`);

    // Resolve user: prefer the authenticated JWT user, fall back to email lookup
    let user: any = null;
    if (authenticatedUserId) {
      try {
        user = await this.usersService.findById(authenticatedUserId);
        if (user) this.logger.log(`Linked onboarding to authenticated user: ${user.email}`);
      } catch (e) {
        this.logger.warn(`Could not resolve authenticated user ${authenticatedUserId}: ${e.message}`);
      }
    }

    if (!user) {
      user = await this.usersService.findByEmail(data.personalDetails.email);
    }

    if (!user) {
      this.logger.log(`Creating new user for ${data.personalDetails.email}`);
      const fullName = data.personalDetails.fullName || "Unknown User";
      const [firstName, ...lastNameParts] = fullName.split(" ");
      try {
        user = await this.usersService.create({
          firstName: firstName || "Unknown",
          lastName: lastNameParts.join(" ") || "",
          email: data.personalDetails.email,
          phone: data.personalDetails.mobileNumber || "",
          password: data.personalDetails.password || "Password@123",
          role: "therapist",
          gender: data.personalDetails.gender,
          dob: data.personalDetails.dob,
          isVerified: false,
          isActive: false,
          email_verified: false,
          mobile_verified: false,
        });

        // Trigger initial email verification link for new registration
        await this.authService.requestEmailVerification(user._id);
      } catch (error) {
        throw new BadRequestException("User creation failed: " + error.message);
      }
    }

    // C2-FIX: Strictly block submission if email/mobile are not verified
    // But ALLOW draft saves so users can save progress before finishing verification.
    const isDraft = data.isDraft === true || data.isDraft === "true";
    if (!isDraft && (!user.email_verified || !user.mobile_verified)) {
      throw new BadRequestException(
        `Onboarding cannot proceed. Please verify your ${!user.email_verified ? 'email' : ''}${!user.email_verified && !user.mobile_verified ? ' and ' : ''}${!user.mobile_verified ? 'mobile number' : ''}.`
      );
    }

    // Safely extract banking fields from nested fieldValues (mobile sends them under 'fields')
    const bankFields = data.bankingDetails?.fields ?? data.bankingDetails ?? {};
    const panNumber = bankFields.panNumber ?? bankFields.panCard ?? data.personalDetails?.panNumber ?? "";
    const aadhaarNumber = bankFields.aadhaarNumber ?? bankFields.aadharNumber ?? data.personalDetails?.aadhaarNumber ?? "";

    // Parse city robustly from serviceArea
    const rawAddress: string = data.serviceArea?.address ?? "";
    const cityParts = rawAddress.split(",").map((s: string) => s.trim()).filter(Boolean);
    const resolvedCity = cityParts[0] || "Unknown";

    const therapistData: any = {
      specialization: data.professionalDetails?.role ?? "",
      subSpecialties: data.professionalDetails?.specializations ?? [],
      qualification: data.professionalDetails?.qualification ?? "",
      experience: parseInt(data.professionalDetails?.experience) || 0,
      licenseNumber: data.professionalDetails?.licenseNumber ?? "",
      authorityName: data.professionalDetails?.authorityName ?? "",
      location: { city: resolvedCity, state: "Unknown", country: "India" },
      serviceAreas: rawAddress ? [rawAddress] : [],
      pincodes: data.serviceArea?.pincodes ?? [],
      areaOfServiceInfo: {
        address: rawAddress,
        latitude: data.serviceArea?.latitude,
        longitude: data.serviceArea?.longitude,
        radiusKm: data.serviceArea?.radiusKm,
        commuteMode: data.serviceArea?.commuteMode,
        maxDistancePerVisit: data.serviceArea?.maxDistancePerVisit,
        acceptEmergency: data.serviceArea?.acceptEmergency,
        acceptLateEvening: data.serviceArea?.acceptLateEvening,
      },
      bankInfo: {
        accountType: data.bankingDetails?.accountType ?? "",
        businessName: data.bankingDetails?.businessName ?? "",
        accountNumber: bankFields.accountNumber ?? "",
        ifscCode: bankFields.ifscCode ?? "",
        bankName: bankFields.bankName ?? "",
        upiId: bankFields.upiId ?? "",
        panNumber: panNumber ?? "",
      },
      // Legacy field name kept for backward compatibility
      bankDetails: {
        accountType: data.bankingDetails?.accountType ?? "",
        businessName: data.bankingDetails?.businessName ?? "",
        accountNumber: bankFields.accountNumber ?? "",
        ifscCode: bankFields.ifscCode ?? "",
        bankName: bankFields.bankName ?? "",
      },
      panCard: panNumber,
      aadhaarCard: aadhaarNumber,
      userId: user._id,
      email: user.email,
      phone: user.phone ?? data.personalDetails?.mobileNumber ?? "",
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at,
      mobile_verified: user.mobile_verified,
      mobile_verified_at: user.mobile_verified_at,
      referralCode: await this.referralsService.getOrCreateReferralCode(user._id.toString()),
      referralCodeUsed: data.personalDetails?.referralCode || "",
      // H2-FIX: Explicitly set status to UNDER_REVIEW (canonical uppercase) on every submission,
      // UNLESS isDraft is true (for auto-saving).
      onboardingStatus: data.isDraft ? "INCOMPLETE" : "UNDER_REVIEW",
      status: data.isDraft ? "INCOMPLETE" : "UNDER_REVIEW",
      statusUpdatedAt: new Date(),
      ...(data.isDraft ? {} : { submittedAt: new Date() }),
      submissionCount: data.isDraft ? 0 : 1,
    };

    const therapist = await this.therapistModel.findOneAndUpdate(
      { userId: user._id },
      {
        $set: therapistData,
        // Track re-submission count without overwriting the base value
        $inc: { submissionCount: 1 },
      },
      { new: true, upsert: true }
    );

    this.logger.log(`Onboarding complete for user ${user.email} — status set to UNDER_REVIEW`);

    // Process Referral
    if (data.personalDetails?.referralCode) {
      try {
        await this.referralsService.registerReferral(
          data.personalDetails.referralCode,
          user._id.toString(),
          ReferralType.EXPERT
        );
      } catch (e) {
        this.logger.warn(`Failed to register referral for ${user.email}: ${e.message}`);
      }
    }

    // Process Expert Bonus if registration fee is paid
    const payment = data.payment ? (typeof data.payment === 'string' ? JSON.parse(data.payment) : data.payment) : {};
    if (payment.status === 'paid' && payment.amount > 0) {
      await this.referralsService.processExpertRegistrationBonus(
        user._id.toString(),
        `REG-${Date.now()}`,
        payment.amount
      );
    }

    return { therapist, user };
  }

  async findAll(query: any = {}) {
    const filter: any = {};
    if (query.clinicId && query.clinicId !== "null") {
      filter.clinicId = query.clinicId;
    } else if (query.clinicId === "null") {
      filter.clinicId = { $exists: false };
    }
    return this.therapistModel.find(filter).lean().exec();
  }

  async findOne(id: string) {
    const therapist = await this.therapistModel.findById(id).lean().exec();
    if (!therapist) throw new NotFoundException(`Therapist #${id} not found`);
    return therapist;
  }

  async getTherapistById(id: string) {
    return this.findOne(id);
  }

  async findInCity(city: string, clinicId?: string) {
    const filter: any = { city: new RegExp(city, 'i') };
    if (clinicId && clinicId !== "null") {
      filter.clinicId = clinicId;
    }
    return this.therapistModel.find(filter).lean().exec();
  }

  async findByUserId(userId: string) {
    if (!userId) return null;

    const query = {
      $or: [
        { userId: userId },
        { userId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null }
      ].filter(q => q.userId !== null)
    };

    // 1. Try main Therapist model
    let result: any = await this.therapistModel.findOne(query).lean().exec();
    if (result) return result;

    // 2. Try Expert model
    result = await this.expertModel.findOne(query).lean().exec();
    if (result) return { ...result, _source: 'expert' };

    // 3. Try legacy therapist model
    result = await this.therapistLegacyModel.findOne(query).lean().exec();
    if (result) return { ...result, _source: 'legacy' };

    return null;
  }
  async updateByUserId(userId: string, data: any) {
    if (!userId) return null;
    return this.therapistModel.findOneAndUpdate(
      { userId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId },
      { $set: { ...data, updatedAt: new Date() } },
      { new: true }
    ).exec();
  }

  async findByPhone(phone: string) {
    const normalized = phone.replace(/^\+91/, '').trim();
    const altPhone = `+91${normalized}`;

    // 1. Try main Therapist model by phone
    let result: any = await this.therapistModel.findOne({
      $or: [{ phone: normalized }, { phone: altPhone }, { mobile: normalized }, { mobile: altPhone }]
    }).lean().exec();
    if (result) return { ...result, _source: 'therapist' };

    // 2. Try Expert model 
    result = await this.expertModel.findOne({
      $or: [{ phone: normalized }, { phone: altPhone }, { mobile: normalized }, { mobile: altPhone }, { mobileNumber: normalized }]
    }).lean().exec();
    if (result) return { ...result, _source: 'expert' };

    // 3. Try legacy therapist model
    result = await this.therapistLegacyModel.findOne({
      $or: [{ phone: normalized }, { phone: altPhone }, { mobile: normalized }, { mobile: altPhone }]
    }).lean().exec();
    if (result) return { ...result, _source: 'legacy' };

    return null;
  }

  async update(id: string, updateDto: any) {
    const therapist = await this.therapistModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!therapist) throw new NotFoundException(`Therapist #${id} not found`);
    return therapist;
  }

  async updateLiveLocation(userId: string, latitude: number, longitude: number) {
    this.logger.log(`Updating live location for user ${userId}: ${latitude}, ${longitude}`);

    // Try both ObjectId and string match to be safe
    let therapist = await this.therapistModel.findOneAndUpdate(
      {
        $or: [
          { userId: new Types.ObjectId(userId) },
          { userId: userId as any },
        ],
      },
      {
        liveLocation: {
          latitude,
          longitude,
          lastUpdated: new Date(),
        },
      },
      { new: true },
    ).exec();

    if (!therapist) {
      // Find user to verify role and get basic info
      const user = await this.usersService.findById(userId);
      if (user && user.role === 'therapist') {
        this.logger.log(`Creating initial therapist profile stub for user ${userId} for live location tracking`);
        therapist = await this.therapistModel.create({
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          onboardingStatus: 'incomplete', // Will be completed during onboarding flow
          status: 'incomplete',
          liveLocation: {
            latitude,
            longitude,
            lastUpdated: new Date(),
          },
        });
      } else {
        this.logger.warn(`Could not find therapist profile or valid therapist user ${userId} to update live location`);
      }
    }

    return therapist;
  }


  async updateFCMToken(userId: string, fcmToken: string) {
    this.logger.log(`Updating FCM token for user ${userId}`);
    return this.therapistModel.findOneAndUpdate(
      {
        $or: [
          { userId: new Types.ObjectId(userId) },
          { userId: userId as any },
        ],
      },
      { fcmToken },
      { new: true },
    ).exec();
  }

  validateTherapistProfile(data: any): any[] {
    const errors = [];

    // Experience: strictly number check. 
    // Usually mobile parses "3-5" into some mapping. If the data experience is provided, ensure it's a number.
    if (data.experience !== undefined) {
      if (typeof data.experience !== 'number' || isNaN(data.experience)) {
        errors.push({
          field: 'experience',
          issue: 'Invalid data type',
          expected: 'number',
          received: typeof data.experience
        });
      }
    }

    if (data.specialization !== undefined) {
      const allowedSpec = ["physiotherapy", "occupational_therapy", "speech_therapy", "nursing", "care_taker", "dietician"];
      if (!allowedSpec.includes(data.specialization)) {
        errors.push({
          field: 'specialization',
          issue: 'Invalid enum value',
          expected: allowedSpec.join('|'),
          received: String(data.specialization)
        });
      }
    }

    if (data.gender !== undefined) {
      const allowedGender = ["Male", "Female", "Other"];
      if (!allowedGender.includes(data.gender)) {
        errors.push({
          field: 'gender',
          issue: 'Invalid gender enum',
          expected: 'Male|Female|Other',
          received: String(data.gender)
        });
      }
    }

    // ---------------- BANKING VALIDATIONS ---------------- //
    // If banking info is provided via "bankingDetails" or "bankDetails"
    const bdCheck = data.bankingDetails || data.bankDetails;
    if (bdCheck) {
      if (bdCheck.accountNumber !== undefined) {
        if (typeof bdCheck.accountNumber !== 'string') {
          errors.push({ field: 'accountNumber', issue: 'Must be string', expected: 'string', received: typeof bdCheck.accountNumber });
        } else if (bdCheck.accountNumber.length < 8 || bdCheck.accountNumber.length > 18) {
          errors.push({ field: 'accountNumber', issue: 'Invalid length', expected: '8-18 chars', received: bdCheck.accountNumber.length.toString() });
        }
      }

      if (bdCheck.ifscCode !== undefined) {
        if (typeof bdCheck.ifscCode === 'string') {
          bdCheck.ifscCode = bdCheck.ifscCode.toUpperCase();
          if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bdCheck.ifscCode)) {
            errors.push({ field: 'ifscCode', issue: 'Invalid formatting', expected: 'regex matches ^[A-Z]{4}0[A-Z0-9]{6}$', received: bdCheck.ifscCode });
          }
        }
      }

      if (bdCheck.upiId !== undefined && bdCheck.upiId !== '') {
        if (typeof bdCheck.upiId === 'string') {
          bdCheck.upiId = bdCheck.upiId.toLowerCase();
          if (!/^[\w.-]+@[\w.-]+$/.test(bdCheck.upiId)) {
            errors.push({ field: 'upiId', issue: 'Invalid UPI format', expected: 'example@upi', received: bdCheck.upiId });
          }
        }
      }
    }
    // ----------------------------------------------------- //

    // Required fields check if isProfileComplete is requested
    if (data.isProfileComplete) {
      if (!data.phone) errors.push({ field: 'phone', issue: 'Missing required field', expected: 'string', received: 'undefined' });
      // Can add more required field checks here
    }

    return errors;
  }

  async updateTherapist(id: string, dto: any) {
    const newErrors = this.validateTherapistProfile(dto);

    // Filter forbidden banking/finance elements to prevent exploits
    const forbiddenKeys = ['isBankVerified', 'bankVerificationStatus', 'walletBalance', 'wallet', 'verifiedBy'];

    // Clear existing validation errors for fields that are being updated correctly
    let flatDto: any = {};
    let updatedFields = [];

    // Safely Flatten Nested updates so we don't wipe out objects (specifically BankDetails)
    for (const [key, value] of Object.entries(dto)) {
      if (forbiddenKeys.includes(key)) continue;

      if (key === 'bankingDetails' || key === 'bankDetails') {
        if (typeof value === 'object' && value !== null) {
          for (const [bKey, bValue] of Object.entries(value)) {
            if (forbiddenKeys.includes(bKey)) continue;

            // Whitelist only allowed modifications
            const allowedBankFields = ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'branchName', 'upiId', 'cancelledChequeUrl', 'businessName', 'accountType'];
            if (allowedBankFields.includes(bKey)) {
              flatDto[`bankDetails.${bKey}`] = bValue;
              updatedFields.push(bKey);
            }
          }
        }
      } else {
        flatDto[key] = value;
        updatedFields.push(key);
      }
    }

    let updateQuery: any = { $set: flatDto };

    const therapist = await this.therapistModel.findById(id).lean().exec();
    if (therapist) {
      let existingErrors = therapist.validationErrors || [];

      // Remove error if the incoming dto has updated that field and the new dto doesn't fail validation
      existingErrors = existingErrors.filter((e: any) => !updatedFields.includes(e.field));

      // Add new errors
      existingErrors = [...existingErrors, ...newErrors];

      updateQuery.$set.validationErrors = existingErrors;
      updateQuery.$set.isProfileComplete = existingErrors.length === 0;
    }

    const updated = await this.therapistModel.findByIdAndUpdate(id, updateQuery, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Therapist #${id} not found`);
    return updated;
  }

  async updateBankStatus(id: string, status: string, reason: string, adminId: string) {
    const therapist = await this.therapistModel.findById(id);
    if (!therapist) throw new NotFoundException("Therapist not found");

    const previousStatus = therapist.bankDetails?.bankVerificationStatus;

    const update: any = {
      "bankDetails.bankVerificationStatus": status,
      "bankDetails.rejectionReason": status === "rejected" ? reason : "",
      "bankDetails.verifiedBy": new Types.ObjectId(adminId),
      "bankDetails.verifiedAt": new Date(),
      "bankDetails.updatedAt": new Date(),
    };

    const updated = await this.therapistModel.findByIdAndUpdate(id, { $set: update }, { new: true });

    // Log the action
    await this.auditLogModel.create({
      therapistId: new Types.ObjectId(id),
      action: "BANK_VERIFICATION_STATUS_CHANGE",
      previousValue: { bankVerificationStatus: previousStatus },
      newValue: { bankVerificationStatus: status },
      reason,
      adminId: new Types.ObjectId(adminId),
    });

    return updated;
  }

  async updateProfileStatus(id: string, updateDto: { status: string; reason: string }, adminId: string) {
    const therapist = await this.therapistModel.findById(id);
    if (!therapist) throw new NotFoundException("Therapist not found");

    const previousStatus = therapist.status;
    // Safe ObjectId resolution — avoids BSON crash when adminId is 'system' or undefined
    const safeAdminObjectId = adminId && Types.ObjectId.isValid(adminId)
      ? new Types.ObjectId(adminId)
      : undefined;

    const update: any = {
      status: updateDto.status,
      statusReason: updateDto.reason,
      statusUpdatedAt: new Date(),
      ...(safeAdminObjectId ? { statusUpdatedBy: safeAdminObjectId } : {}),
    };

    // Auto-approve onboarding when activated
    if (updateDto.status === 'ACTIVE') {
      update.onboardingStatus = 'ACTIVE';
      update.status = 'ACTIVE';
      update.isActive = true;
    }

    // Auto-set onboardingStatus to 'REJECTED' when status is rejecting
    if (['SUSPENDED', 'REJECTED', 'On Hold'].includes(updateDto.status)) {
      update.onboardingStatus = 'REJECTED';
      update.status = updateDto.status;
      update.isActive = false;
    }

    const updated = await this.therapistModel.findByIdAndUpdate(id, { $set: update }, { new: true });

    // Sync with User model
    if (therapist.userId) {
      if (updateDto.status === 'ACTIVE') {
        await this.usersService.userModel.findByIdAndUpdate(therapist.userId, {
          $set: { isActive: true, status: 'ACTIVE' }
        });
        this.logger.log(`Synchronized User ${therapist.userId} activation state for Therapist ${id}`);
      } else if (['SUSPENDED', 'REJECTED', 'On Hold'].includes(updateDto.status)) {
        await this.usersService.userModel.findByIdAndUpdate(therapist.userId, {
          $set: { isActive: false, status: 'INACTIVE' }
        });
        this.logger.log(`Synchronized User ${therapist.userId} restriction state for Therapist ${id}`);
      }
    }

    // Log the action (gracefully skips if audit model unavailable)
    try {
      await this.auditLogModel.create({
        therapistId: new Types.ObjectId(id),
        action: "PROFILE_STATUS_CHANGE",
        previousValue: { status: previousStatus },
        newValue: { status: updateDto.status },
        reason: updateDto.reason,
        ...(safeAdminObjectId ? { adminId: safeAdminObjectId } : {}),
      });
    } catch (e) {
      this.logger.warn(`Audit log failed (non-critical): ${e.message}`);
    }

    // Push notification to therapist (gracefully skips if notification model fails)
    try {
      await this.notificationModel.create({
        therapistId: new Types.ObjectId(id),
        title: `Profile Status: ${updateDto.status}`,
        message: updateDto.reason || `Your profile status has been updated to ${updateDto.status}`,
        type: ["Suspended", "Fraud Alert", "Restricted"].includes(updateDto.status) ? "warning" : "general",
        displayType: ["Suspended", "Fraud Alert"].includes(updateDto.status) ? "persistent" : "temporary",
        ...(safeAdminObjectId ? { sentBy: safeAdminObjectId } : {}),
        requiresAcknowledgement: ["Suspended", "Fraud Alert"].includes(updateDto.status),
      });
    } catch (e) {
      this.logger.warn(`Notification push failed (non-critical): ${e.message}`);
    }

    // SMTP Email notification to therapist on status change
    try {
      const therapistEmail = (updated as any)?.email || (therapist as any)?.email;
      const therapistName = (updated as any)?.name || `${(therapist as any)?.firstName || ''} ${(therapist as any)?.lastName || ''}`.trim() || 'Therapist';
      if (therapistEmail) {
        const isApproved = updateDto.status === 'ACTIVE';
        const isRejected = ['REJECTED', 'SUSPENDED', 'On Hold'].includes(updateDto.status);
        const subjectMap: Record<string, string> = {
          'ACTIVE': '🎉 Your AriesXpert Profile is Approved!',
          'REJECTED': 'AriesXpert – Profile Update Required',
          'SUSPENDED': 'AriesXpert – Account Suspended',
          'On Hold': 'AriesXpert – Account On Hold',
        };
        const subject = subjectMap[updateDto.status] || `AriesXpert – Profile Status: ${updateDto.status}`;
        const bodyHtml = isApproved
          ? `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
              <h2 style="color:#26d07d;margin-top:0;">Welcome to AriesXpert!</h2>
              <p>Dear <strong>${therapistName}</strong>,</p>
              <p>Congratulations! Your therapist profile has been <strong style="color:#26d07d;">APPROVED</strong>. You can now log in to the AriesXpert mobile app and start receiving patient leads.</p>
              <p style="font-size:12px;color:#888;">AriesXpert Healthcare Network</p>
            </div>`
          : `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
              <h2 style="color:#f59e0b;margin-top:0;">Profile Status Update</h2>
              <p>Dear <strong>${therapistName}</strong>,</p>
              <p>Your AriesXpert profile status has been updated to: <strong style="color:#f59e0b;">${updateDto.status}</strong></p>
              ${updateDto.reason ? `<p>Reason: <em>${updateDto.reason}</em></p>` : ''}
              <p>Please log in to the AriesXpert app for details or contact support if you have questions.</p>
              <p style="font-size:12px;color:#888;">AriesXpert Healthcare Network</p>
            </div>`;
        await this.emailService.sendManualMail(therapistEmail, subject, bodyHtml);
        this.logger.log(`Status email sent to therapist ${therapistEmail} (status: ${updateDto.status})`);
      }
    } catch (e) {
      this.logger.warn(`SMTP status notification failed (non-critical): ${e.message}`);
    }

    return updated;
  }


  async addFinancialAdjustment(id: string, adjustDto: any, adminId: string) {
    const therapist = await this.therapistModel.findById(id);
    if (!therapist) throw new NotFoundException("Therapist not found");

    const adjustment = await this.financialAdjustmentModel.create({
      therapistId: new Types.ObjectId(id),
      type: adjustDto.type,
      amount: adjustDto.amount,
      reason: adjustDto.reason,
      method: adjustDto.method,
      adminId: new Types.ObjectId(adminId),
      status: "processed",
    });

    // Update therapist balances
    const update: any = { $inc: {} };
    if (adjustDto.type === "penalty") {
      update.$inc.totalPenalties = adjustDto.amount;
      update.$inc.penaltyBalance = adjustDto.amount;
      if (adjustDto.method === "wallet_deduction") {
        update.$inc.walletBalance = -adjustDto.amount;
      }
    } else {
      // bonus, adjustment, reimbursement
      if (adjustDto.method === "wallet_credit") {
        update.$inc.walletBalance = adjustDto.amount;
      }
      if (adjustDto.type === "bonus") {
        update.$inc.totalEarnings = adjustDto.amount;
      }
    }

    await this.therapistModel.findByIdAndUpdate(id, update);

    // Notify therapist
    await this.notificationModel.create({
      therapistId: new Types.ObjectId(id),
      title: `${adjustDto.type.toUpperCase()} Applied`,
      message: `An amount of ₹${adjustDto.amount} has been ${adjustDto.type === 'penalty' ? 'deducted' : 'added'} as ${adjustDto.reason}`,
      type: adjustDto.type === "penalty" ? "warning" : "payment",
      sentBy: new Types.ObjectId(adminId),
    });

    return adjustment;
  }

  async sendTherapistAlert(id: string, alertDto: any, adminId: string) {
    return this.notificationModel.create({
      therapistId: new Types.ObjectId(id),
      title: alertDto.title,
      message: alertDto.message,
      type: alertDto.type,
      displayType: alertDto.displayType,
      requiresAcknowledgement: alertDto.requiresAcknowledgement,
      sentBy: new Types.ObjectId(adminId),
    });
  }

  async getFraudLogs(id: string) {
    return this.fraudLogModel.find({ therapistId: new Types.ObjectId(id) }).sort({ createdAt: -1 }).lean();
  }

  async getAuditLogs(id: string) {
    return this.auditLogModel.find({ therapistId: new Types.ObjectId(id) }).sort({ createdAt: -1 }).populate("adminId", "firstName lastName").lean();
  }

  async getTherapistStats(id: string) {
    const therapistId = new Types.ObjectId(id);
    const now = new Date();
    const startM = startOfMonth(now);
    const endM = endOfMonth(now);

    // 1. Lifetime Earnings
    const lifetimeEarnings = await this.ledgerModel.aggregate([
      { $match: { userId: id, category: LedgerCategory.EARNING } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // 2. Current Month Stats
    const currentMonthStats = await this.ledgerModel.aggregate([
      {
        $match: {
          userId: id,
          createdAt: { $gte: startM, $lte: endM }
        }
      },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          earned: {
            $sum: {
              $cond: [{ $eq: ["$category", LedgerCategory.EARNING] }, "$amount", 0]
            }
          }
        }
      }
    ]);

    // Calculate Paid / Pending for current month
    let monthlyEarned = 0;
    let monthlyPaid = 0;
    let monthlyPending = 0;

    currentMonthStats.forEach(stat => {
      if (stat._id === LedgerStatus.PAID) monthlyPaid += stat.total;
      if (stat._id === LedgerStatus.PENDING) monthlyPending += stat.total;
      monthlyEarned += stat.earned;
    });

    // 3. Fraud Metrics (Mocked/Simple for now)
    const therapist = await this.therapistModel.findById(id).select("fraudCount fraudScore").lean();

    return {
      lifetimeEarnings: lifetimeEarnings[0]?.total || 0,
      currentMonth: {
        earned: monthlyEarned,
        paid: monthlyPaid,
        pending: monthlyPending,
      },
      fraud: {
        count: therapist?.fraudCount || 0,
        score: therapist?.fraudScore || 0,
      },
      lastUpdated: new Date(),
    };
  }

  async getDashboardStats(therapistId: string) {
    // This previously used getClinicConnection() which was a mistake for therapist app
    // Therapists are global, but they interact with clinics.
    return {
      activeTreatments: 0,
      todayVisits: 0,
      totalEarnings: 0,
      pendingInvoices: 0
    };
  }

  async getUpcomingAppointments(therapistId: string) {
    // Return empty for now or implement global visit search
    return [];
  }

  /**
   * Advanced Rejection Logic
   * Marking specific fields and documents as incorrect.
   */
  async rejectExpert(id: string, rejectionData: {
    reason: string,
    fieldErrors: { field: string, issue: string }[],
    documentErrors: { docName: string, reason: string }[],
    // Added for flexible input
    fieldErrorsTyped?: { field: string, issue: string }[],
    documentErrorsTyped?: { docType: string, issue: string }[]
  }, adminId: string) {
    const therapist = await this.therapistModel.findById(id);
    if (!therapist) throw new NotFoundException("Therapist not found");

    const safeAdminObjectId = adminId && Types.ObjectId.isValid(adminId)
      ? new Types.ObjectId(adminId)
      : undefined;

    // Harmonize inputs
    const docErrors = rejectionData.documentErrorsTyped || rejectionData.documentErrors.map(d => ({ docType: d.docName, issue: d.reason }));
    const fErrors = rejectionData.fieldErrorsTyped || rejectionData.fieldErrors;

    const individualErrors: any = {};
    docErrors.forEach(err => {
      const type = err.docType.toLowerCase();
      if (type.includes("aadhar") || type.includes("aadhaar")) {
        individualErrors["aadharCard"] = { status: "REJECTED", reason: err.issue };
        individualErrors["aadhaarCard"] = { status: "REJECTED", reason: err.issue };
      } else if (type.includes("pan")) {
        individualErrors["bankDetails.panCard"] = { status: "REJECTED", reason: err.issue };
        individualErrors["panCard"] = { status: "REJECTED", reason: err.issue };
      } else if (type.includes("license")) {
        individualErrors["professionalInfo.license"] = { status: "REJECTED", reason: err.issue };
      } else if (type.includes("degree") || type.includes("certificate")) {
        individualErrors["professionalInfo.degreeCertificate"] = { status: "REJECTED", reason: err.issue };
      }
    });

    const update: any = {
      $set: {
        status: "REJECTED",
        onboardingStatus: "REJECTED",
        rejectionReason: rejectionData.reason,
        rejectionStatus: "REJECTED",
        ...individualErrors,
        validationErrors: fErrors.map(e => ({
          field: e.field,
          issue: e.issue,
          received: "userValue"
        })),
        rejectionReasons: fErrors.map(e => ({
          section: "Verification",
          field: e.field,
          reason: e.issue || "Invalid data"
        })),
        statusUpdatedAt: new Date(),
        statusUpdatedBy: safeAdminObjectId,
      }
    };

    const updated = await this.therapistModel.findByIdAndUpdate(id, update, { new: true });

    // Notify user
    try {
      await this.notificationModel.create({
        therapistId: new Types.ObjectId(id),
        title: "Profile Rejected",
        message: rejectionData.reason || "Your profile needs corrections. Please check the rejected fields.",
        type: "warning",
        sentBy: safeAdminObjectId
      });
    } catch (e) {
      console.error("Failed to send rejection notification:", e);
    }

    return updated;
  }
}
