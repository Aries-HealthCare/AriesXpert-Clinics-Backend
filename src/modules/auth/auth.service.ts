import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { TherapistsService } from "../therapists/therapists.service";
import * as bcrypt from "bcrypt";
import { ClinicsService } from "../clinics/clinics.service";
import { EmailService } from "../email/email.service";
import { RegistryService } from "../registry/registry.service";
import { ClinicUsersService } from "../clinics/clinic-users.service";
import { tenantLocalStorage } from "../../common/multitenancy/tenant.context";

@Injectable()
export class AuthService {
  constructor(
    private readonly clinicUsersService: ClinicUsersService,
    private usersService: UsersService,
    @Inject(forwardRef(() => TherapistsService))
    private therapistsService: TherapistsService,
    private jwtService: JwtService,
    private clinicsService: ClinicsService,
    private emailService: EmailService,
    private registryService: RegistryService,
  ) { }


  async register(registerDto: any) {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      specialization,
      licenseNumber,
      experience,
    } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException("User already exists with this email");
    }

    const createPayload: any = {
      firstName,
      lastName,
      email,
      password,
      role: role || "therapist",
    };
    if (phone) {
      createPayload.phone = phone;
    }
    const user = await this.usersService.create(createPayload);

    if (user.role === "therapist") {
      await this.therapistsService.create({
        userId: user._id,
        specialization,
        licenseNumber,
        experience,
      });
    }

    const token = this.jwtService.sign({ id: user._id });

    return {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: any) {
    const { email, password } = loginDto;
    const normalizedEmail = (email || "").toString().toLowerCase().trim();
    const normalizedPassword = (password || "").toString().trim();

    // DEV BACKDOOR: Auto-seed and login for development
    if (process.env.ALLOW_DEV_BACKDOOR === "true" && normalizedPassword === "12345") {
      if (normalizedEmail === "akshaypatel@ariesxpert.com") {
        let adminUser = await this.usersService.findByEmail(normalizedEmail);
        if (!adminUser) {
          adminUser = await this.usersService.create({
            firstName: "Akshay",
            lastName: "Patel",
            email: normalizedEmail,
            password: "placeholder",
            phone: "9999999999",
            role: "founder",
          });
        }

        // Force active and founder role for testing
        adminUser.isActive = true;
        adminUser.isVerified = true;
        adminUser.role = "founder";
        if (adminUser.save) await adminUser.save();

        const token = this.jwtService.sign({
          id: adminUser._id || adminUser.id,
          clinicId: null,
          databaseName: null,
        });

        return {
          token,
          user: {
            id: adminUser._id || adminUser.id,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            email: adminUser.email,
            role: adminUser.role,
            clinicId: null,
            databaseName: null,
            therapistProfile: null,
          },
          message: "Login successful (Dev Backdoor)",
        };
      }
    }


    // 2. Identification: Where does this user belong?
    let user: any = await this.usersService.findByEmail(normalizedEmail);
    let resolvedClinicId = null;
    let resolvedDatabaseName = null;

    if (!user) {
      // Not in global users, check if it's a clinic email
      const clinics = await this.clinicsService.findAll({ email: normalizedEmail });
      if (clinics && clinics.length > 0) {
        const clinic = clinics[0];
        resolvedClinicId = String(clinic._id);

        const registry = await this.registryService.getClinicRegistry(resolvedClinicId);
        if (registry) {
          resolvedDatabaseName = registry.databaseName;

          // Check if user exists in that isolated database
          user = await tenantLocalStorage.run({ clinicId: resolvedClinicId, databaseName: resolvedDatabaseName }, async () => {
            return this.clinicUsersService.findByEmail(normalizedEmail);
          });

          // AUTO-CREATE CLINIC OWNER IF NEITHER EXISTS
          if (!user) {
            const ownerName = String(clinic.name || "").trim();
            const [firstName, ...rest] = ownerName ? ownerName.split(" ") : ["Clinic", "Owner"];
            const lastName = rest.join(" ") || "Owner";
            let userPhone = clinic.phone || `c_${Date.now()}`;

            user = await tenantLocalStorage.run({ clinicId: resolvedClinicId, databaseName: resolvedDatabaseName }, async () => {
              return this.clinicUsersService.create(resolvedClinicId, {
                firstName,
                lastName,
                email: normalizedEmail,
                password, // Will be hashed by pre-save hook
                phone: userPhone,
                role: "clinic_owner",
                status: "active",
                isActive: true,
                isVerified: true,
              });
            });
          }
        }
      } else {
        throw new UnauthorizedException("Invalid credentials");
      }
    } else {
      // Found in global, resolve context if linked to clinic
      resolvedClinicId = (user as any).clinicId;
      if (resolvedClinicId) {
        const reg = await this.registryService.getClinicRegistry(String(resolvedClinicId));
        if (reg) resolvedDatabaseName = reg.databaseName;
      }
    }

    if (!user) throw new UnauthorizedException("Invalid credentials");

    // 3. Authentication: Password check
    const isPasswordValid = await bcrypt.compare(normalizedPassword, user.password);
    if (!isPasswordValid) {
      // Legacy clinic_owner support for first login
      if (user.role === "clinic_owner" && !(user as any).lastLogin) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(normalizedPassword, salt);
        await (user as any).save({ validateModifiedOnly: true });
      } else {
        throw new UnauthorizedException("Invalid credentials");
      }
    }

    // 4. Update and Token Generation
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    } else {
      await this.usersService.updateLastLogin(user._id || user.id);
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Your account is not active. Please contact support.");
    }

    const token = this.jwtService.sign({
      id: user._id || user.id,
      clinicId: resolvedClinicId,
      databaseName: resolvedDatabaseName
    });

    let therapistProfile = null;
    if (user.role === "therapist") {
      therapistProfile = await this.therapistsService.findByUserId(user.id);
    }

    return {
      token,
      user: {
        id: user._id || user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        clinicId: resolvedClinicId,
        databaseName: resolvedDatabaseName,
        therapistProfile,
      },
      message: "Login successful",
    };
  }

  async otpLogin(mobile: string) {
    const normalizedPhone = (mobile || "").toString().replace(/^\+91/, "").trim();

    // 1. Identification: Where does this user belong?
    let user: any = await this.usersService.findByPhone(normalizedPhone);
    let resolvedClinicId = null;
    let resolvedDatabaseName = null;

    if (!user) {
      // Try with country code if missed
      user = await this.usersService.findByPhone(`+91${normalizedPhone}`);
    }

    if (!user) {
      // Not in global users, check if it's a clinic owner phone
      const clinics = await this.clinicsService.findAll({ phone: { $regex: new RegExp(normalizedPhone, 'i') } });
      if (clinics && clinics.length > 0) {
        const clinic = clinics[0];
        resolvedClinicId = String(clinic._id);

        const registry = await this.registryService.getClinicRegistry(resolvedClinicId);
        if (registry) {
          resolvedDatabaseName = registry.databaseName;

          // Check if user exists in that isolated database
          user = await tenantLocalStorage.run({ clinicId: resolvedClinicId, databaseName: resolvedDatabaseName }, async () => {
            // Clinic users don't have a direct findByPhone right now, but assuming they might in the future or we use email
            // Let's create an auto owner if missing.
            let existing = await this.clinicUsersService.findByPhone(normalizedPhone);
            if (!existing) existing = await this.clinicUsersService.findByPhone(`+91${normalizedPhone}`);
            if (existing) return existing;

            const ownerName = String(clinic.name || "").trim();
            const [firstName, ...rest] = ownerName ? ownerName.split(" ") : ["Clinic", "Owner"];
            const lastName = rest.join(" ") || "Owner";
            return this.clinicUsersService.create(resolvedClinicId, {
              firstName,
              lastName,
              email: clinic.email || `${normalizedPhone}@clinic.ariesxpert.com`,
              password: `Auto@${Date.now()}`,
              phone: normalizedPhone,
              role: "clinic_owner",
              status: "active",
              isActive: true,
              isVerified: true,
            });
          });
        }
      } else {
        // Therapist must be created from Admin Dashboard first.
        throw new UnauthorizedException("This mobile number is not registered. Contact admin.");
      }
    } else {
      // Found in global, resolve context if linked to clinic
      resolvedClinicId = (user as any).clinicId;
      if (resolvedClinicId) {
        const reg = await this.registryService.getClinicRegistry(String(resolvedClinicId));
        if (reg) resolvedDatabaseName = reg.databaseName;
      }
    }

    if (!user) throw new UnauthorizedException("User resolution failed during OTP login.");

    // 2. Update and Token Generation
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    } else {
      await this.usersService.updateLastLogin(user._id || user.id);
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Your account is not active. Please contact support.");
    }

    // C4-FIX: OTP login proves mobile ownership — auto-mark mobile as verified
    if (!user.mobile_verified) {
      user.mobile_verified = true;
      user.mobile_verified_at = new Date();
      await (user as any).save();
    }

    const token = this.jwtService.sign({
      id: user._id || user.id,
      clinicId: resolvedClinicId,
      databaseName: resolvedDatabaseName
    });

    let therapistProfile = null;
    if (user.role === "therapist") {
      therapistProfile = await this.therapistsService.findByUserId(user.id || user._id);
      // C4-FIX: Also sync mobile_verified to therapist profile
      if (therapistProfile && !therapistProfile.mobile_verified) {
        therapistProfile.mobile_verified = true;
        therapistProfile.mobile_verified_at = new Date();
        await (therapistProfile as any).save();
      }
    }

    return {
      token,
      user: {
        id: user._id || user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || user.phoneNumber || normalizedPhone,
        phoneNumber: user.phone || user.phoneNumber || normalizedPhone,
        role: user.role,
        clinicId: resolvedClinicId,
        databaseName: resolvedDatabaseName,
        therapistProfile,
      },
      message: "Login successful via OTP",
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Silently return to prevent user enumeration
      return { message: "If your email is registered, you will receive a reset link shortly." };
    }

    // Generate a reset token (in memory placeholder for logic)
    const resetToken = this.jwtService.sign({ id: user._id, type: 'reset' }, { expiresIn: '15m' });

    // You would typically save this token to the user document, but for now we generate link
    const resetLink = `https://www.ariesxpert.com/reset-password?token=${resetToken}`;
    const expiryStr = new Date(Date.now() + 15 * 60 * 1000).toLocaleString();

    await this.emailService.sendPasswordResetEmail(email, user.firstName, resetLink, expiryStr);

    return { message: "Password reset instructions sent to your email." };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = this.jwtService.verify(token);
      if (decoded.type !== 'reset') {
        throw new BadRequestException("Invalid token type");
      }
      const user = await this.usersService.findById(decoded.id);
      if (!user) {
        throw new BadRequestException("User not found");
      }

      user.set('password', newPassword);
      user.isVerified = true;
      await user.save();

      return { message: "Password updated successfully" };
    } catch (error) {
      throw new BadRequestException("Invalid or expired reset token");
    }
  }

  /**
   * Request an email verification link.
   * C2-FIX: Sends a secure, time-bound (15m) verification link via Admin SMTP.
   */
  async requestEmailVerification(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException("User not found");

    if (user.email_verified) {
      return { success: true, message: "Email is already verified." };
    }

    const verificationToken = this.jwtService.sign(
      { id: user._id, type: 'email_verification' },
      { expiresIn: '15m' }
    );

    // Store token for single-use check
    user.verification_token = verificationToken;
    await user.save();

    // C5-FIX: Use the actual backend API URL for the verification link
    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL
      || `http://localhost:${process.env.PORT || 3001}`;
    const verificationLink = `${backendUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    await this.emailService.sendVerificationEmail(user.email, user.firstName || 'User', verificationLink);

    return { success: true, message: "Verification email sent." };
  }

  /**
   * Verify email via token.
   * C2-FIX: Marks email_verified = true and stores timestamp/IP.
   */
  async verifyEmail(token: string, ip: string) {
    try {
      const decoded = this.jwtService.verify(token);
      if (decoded.type !== 'email_verification') {
        throw new BadRequestException("Invalid token type");
      }

      // C5-FIX: Use findByIdWithVerificationToken to include the select:false field
      const user = await this.usersService.findByIdWithVerificationToken(decoded.id);
      if (!user) throw new BadRequestException("User not found");

      if (user.email_verified) {
        return { success: true, message: "Email already verified.", html: this.buildVerificationHtml(true, 'Email Already Verified', 'Your email address has already been verified. You can close this page and continue in the app.') };
      }

      // Check if token matches (single-use enforcement)
      if (user.verification_token !== token) {
        throw new BadRequestException("Token has already been used or is outdated.");
      }

      user.email_verified = true;
      user.email_verified_at = new Date();
      user.verification_token = null; // Mark as used
      await user.save();

      // Sync to therapist profile if it exists
      if (user.role === 'therapist') {
        await this.therapistsService.updateByUserId(user._id.toString(), {
          email_verified: true,
          email_verified_at: new Date()
        });
      }

      return { success: true, message: "Email verified successfully.", html: this.buildVerificationHtml(true, 'Email Verified! ✅', 'Your email address has been successfully verified. You can now close this page and continue your registration in the AriesXpert app.') };
    } catch (error) {
      return { success: false, message: error.message || "Invalid or expired verification token", html: this.buildVerificationHtml(false, 'Verification Failed', error.message || 'The verification link is invalid or has expired. Please request a new verification link from the app.') };
    }
  }

  /**
   * Build a styled HTML page for email verification result
   */
  private buildVerificationHtml(success: boolean, title: string, message: string): string {
    const color = success ? '#26d07d' : '#ff4444';
    const icon = success ? '✅' : '❌';
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} – AriesXpert</title>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#07101a; color:#e6eef3; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:24px; padding:48px 40px; max-width:420px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.3); }
  .icon { font-size:64px; margin-bottom:16px; }
  h1 { color:${color}; font-size:24px; margin:0 0 16px; }
  p { color:#b0bec5; font-size:15px; line-height:1.6; margin:0 0 24px; }
  .brand { color:#00D4FF; font-weight:700; font-size:18px; letter-spacing:1px; margin-top:24px; }
</style></head>
<body><div class="card">
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <div class="brand">ARIESXPERT</div>
</div></body></html>`;
  }

  /**
   * C4-FIX: Request email verification by email address (no JWT required).
   * Used during onboarding when the user hasn't completed registration yet.
   */
  async requestEmailVerificationByEmail(email: string, name?: string) {
    if (!email) throw new BadRequestException("Email is required");

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // C5-FIX: For brand new users who don't have an account yet,
      // create a minimal user record so we can send the verification email.
      // The onboarding flow will later update this user with full details.
      try {
        const [firstName, ...rest] = (name || 'New User').split(' ');
        user = await this.usersService.create({
          firstName: firstName || 'New',
          lastName: rest.join(' ') || 'User',
          email: email,
          phone: '',
          password: `Aries@${Date.now()}`, // Temporary password
          role: 'therapist',
          isVerified: false,
          isActive: false,
          email_verified: false,
          mobile_verified: false,
        });
      } catch (createErr) {
        // If creation fails (e.g. duplicate), try finding again
        user = await this.usersService.findByEmail(email);
        if (!user) {
          return { success: true, message: "If this email is registered, a verification link has been sent." };
        }
      }
    }

    return this.requestEmailVerification(user._id.toString());
  }

  async updateFCMToken(userId: string, fcmToken: string) {
    // Update global user
    await this.usersService.updateFCM(userId, fcmToken);

    // Update therapist profile if it exists
    await this.therapistsService.updateFCMToken(userId, fcmToken);

    return { success: true, message: 'FCM token updated successfully' };
  }
}

