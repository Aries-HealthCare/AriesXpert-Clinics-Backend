import { Injectable, Logger, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OtpLog, OtpLogDocument } from './schemas/otp-log.schema';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

export interface SendOtpParams {
  mobile: string;
  purpose: string;
}

export interface VerifyOtpParams {
  mobile: string;
  otp: string;
  requestId: string;
  purpose: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_OTPS_PER_WINDOW = 3;
  private readonly OTP_RATE_LIMIT_MINUTES = 15;

  constructor(
    @InjectModel(OtpLog.name) private otpLogModel: Model<OtpLogDocument>,
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) { }

  /**
   * Internal method to check rate limiting for OTP generation
   */
  private async checkRateLimit(mobile: string, purpose: string): Promise<void> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - this.OTP_RATE_LIMIT_MINUTES);

    const count = await this.otpLogModel.countDocuments({
      mobile,
      purpose,
      created_at: { $gte: windowStart },
    });

    if (count >= this.MAX_OTPS_PER_WINDOW) {
      throw new BadRequestException('Too many OTP requests. Please try again later.');
    }
  }

  /**
   * Generate and send OTP via MSG91
   */
  async sendOtp(params: SendOtpParams): Promise<{ success: boolean; requestId: string; message: string }> {
    const { mobile, purpose } = params;

    // Check rate limit
    await this.checkRateLimit(mobile, purpose);

    // C3-FIX: Check if there's a recent OTP sent to enforce cooldown (60s)
    const recentOtp = await this.otpLogModel.findOne({
      mobile: mobile.startsWith('+') ? mobile.substring(1) : `91${mobile}`,
      purpose,
      created_at: { $gte: new Date(Date.now() - 60000) },
    });

    if (recentOtp) {
      throw new BadRequestException('Please wait 60 seconds before requesting another OTP.');
    }

    // Format mobile number (ensure country code)
    const formattedMobile = mobile.startsWith('+') ? mobile.substring(1) : `91${mobile}`;

    // Configuration from ENV
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY') || process.env.MSG91_AUTH_KEY;
    const templateId = this.configService.get<string>('MSG91_TEMPLATE_ID') || process.env.MSG91_TEMPLATE_ID;
    const senderId = this.configService.get<string>('MSG91_SENDER_ID') || process.env.MSG91_SENDER_ID;
    // In MSG91 Flow, we prefer using SendOTP API standard method

    const requestId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    // Log the generated OTP intent
    await this.otpLogModel.create({
      mobile: formattedMobile,
      request_id: requestId,
      purpose,
      status: 'pending',
      expires_at: expiresAt,
    });

    // Handle Mock/Development environment where MSG91 might not be configured fully
    if (!authKey || authKey === 'MOCK' || authKey === 'MSG91_AUTH_KEY') {
      this.logger.log(`MOCK OTP sent to ${formattedMobile} for ${purpose}. Request ID: ${requestId}`);
      // Simulating external delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, requestId, message: "OTP sent successfully (MOCK)." };
    }

    try {
      // MSG91 Send OTP V5 API
      // Reference: https://docs.msg91.com/p/tf9GtextN/e/7WESqAMZCM
      const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${formattedMobile}&authkey=${authKey}`;
      const response = await axios.get(msg91Url, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.type === 'success') {
        return { success: true, requestId, message: "OTP sent successfully." };
      } else {
        this.logger.error(`MSG91 OTP send failed: ${JSON.stringify(response.data)}`);
        await this.handleOtpFailure(requestId);
        throw new InternalServerErrorException('Failed to send OTP via SMS provider.');
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`MSG91 OTP Exception: ${error.message}`);
      await this.handleOtpFailure(requestId);
      throw new InternalServerErrorException('SMS provider error.');
    }
  }

  /**
   * Generic SMS send via MSG91 Flow (Phase 7: SOS Escalation)
   */
  async sendSms(mobile: string, message: string): Promise<boolean> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY') || process.env.MSG91_AUTH_KEY;
    const formattedMobile = mobile.startsWith('+') ? mobile.substring(1) : `91${mobile}`;

    if (!authKey || authKey === 'MOCK' || authKey === 'MSG91_AUTH_KEY') {
      this.logger.log(`[MOCK SMS] To: ${formattedMobile} | Msg: ${message}`);
      return true;
    }

    try {
      // MSG91 Flow API is preferred for generic SMS
      // Ref: https://docs.msg91.com/p/tf9GtextN/e/7XESqAMZCM
      const response = await axios.post('https://control.msg91.com/api/v5/flow/', {
        template_id: this.configService.get<string>('MSG91_SOS_FLOW_ID') || 'sos_trigger_flow',
        sender: this.configService.get<string>('MSG91_SENDER_ID') || 'ARIESX',
        short_url: '0',
        mobiles: formattedMobile,
        var1: message // Placeholder for template variable
      }, {
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json'
        }
      });

      return response.data.type === 'success';
    } catch (e) {
      this.logger.error(`SMS send failure: ${e.message}`);
      return false;
    }
  }

  /**
   * Resend OTP via MSG91
   */
  async resendOtp(params: { mobile: string; retryType: 'voice' | 'text' }): Promise<{ success: boolean; message: string }> {
    const { mobile, retryType } = params;
    const formattedMobile = mobile.startsWith('+') ? mobile.substring(1) : `91${mobile}`;

    const authKey = this.configService.get<string>('MSG91_AUTH_KEY') || process.env.MSG91_AUTH_KEY;

    if (!authKey || authKey === 'MOCK' || authKey === 'MSG91_AUTH_KEY') {
      this.logger.log(`MOCK OTP Resent to ${formattedMobile} via ${retryType}.`);
      return { success: true, message: "OTP resent successfully (MOCK)." };
    }

    try {
      const msg91Url = `https://control.msg91.com/api/v5/otp/retry?authkey=${authKey}&retrytype=${retryType}&mobile=${formattedMobile}`;
      const response = await axios.get(msg91Url);

      if (response.data.type === 'success' || response.data.type === 'error') {
        // sometimes MSG91 returns error for resend if timeframe hasn't elapsed, but we can pass success if handled
        if (response.data.type === 'error' && !response.data.message.includes('already Sent')) {
          throw new Error(response.data.message);
        }
        return { success: true, message: "OTP resent successfully." };
      }
      throw new InternalServerErrorException('Failed to resend OTP.');
    } catch (error) {
      this.logger.error(`MSG91 Resend Exception: ${error.message}`);
      throw new InternalServerErrorException('SMS provider error.');
    }
  }

  /**
   * Verify OTP via MSG91
   */
  async verifyOtp(params: VerifyOtpParams): Promise<{ success: boolean; message: string }> {
    const { mobile, otp, requestId, purpose } = params;
    const formattedMobile = mobile.startsWith('+') ? mobile.substring(1) : `91${mobile}`;

    // Find the latest pending OTP log
    const otpLog = await this.otpLogModel.findOne({
      mobile: formattedMobile,
      request_id: requestId,
      purpose,
      status: 'pending',
    }).sort({ created_at: -1 });

    if (!otpLog) {
      throw new BadRequestException('Invalid or expired OTP request.');
    }

    // Check expiry locally first
    if (new Date() > otpLog.expires_at) {
      otpLog.status = 'expired';
      await otpLog.save();
      throw new BadRequestException('OTP has expired.');
    }

    const authKey = this.configService.get<string>('MSG91_AUTH_KEY') || process.env.MSG91_AUTH_KEY;

    // Handle Mock verification
    if (!authKey || authKey === 'MOCK' || authKey === 'MSG91_AUTH_KEY') {
      if (otp === '1234' || otp === '123456') {
        otpLog.status = 'verified';
        await otpLog.save();

        // C4-FIX: Also update mobile_verified in MOCK mode (was missing, causing onboarding block)
        await this.markMobileVerified(mobile, formattedMobile);

        return { success: true, message: "OTP verified successfully (MOCK)." };
      } else {
        throw new BadRequestException('Invalid OTP.');
      }
    }

    try {
      const msg91Url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${formattedMobile}&authkey=${authKey}`;
      const response = await axios.get(msg91Url);

      if (response.data.type === 'success' || response.data.message === 'OTP verified success') {
        otpLog.status = 'verified';
        await otpLog.save();

        // C3-FIX: Update User's mobile_verified status for all purposes
        await this.markMobileVerified(mobile, formattedMobile);

        return { success: true, message: "OTP verified successfully." };
      } else {
        // Increment attempt count (logic simplified for now, usually handled by MSG91 internally)
        throw new BadRequestException(response.data.message || 'Invalid OTP.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`MSG91 Verify Exception: ${error.message}`);
      throw new InternalServerErrorException('SMS provider error during verification.');
    }
  }

  /**
   * C4-FIX: Shared helper to mark a mobile as verified on User + Therapist.
   * Called from both MOCK and real MSG91 verification paths.
   */
  private async markMobileVerified(mobile: string, formattedMobile: string): Promise<void> {
    try {
      const user = await this.usersService.findByPhone(mobile) || await this.usersService.findByPhone(formattedMobile);
      if (user) {
        user.mobile_verified = true;
        user.mobile_verified_at = new Date();
        await (user as any).save();

        // Sync to therapist profile
        if (user.role === 'therapist') {
          const therapist = await this.authService['therapistsService'].findByUserId(user._id);
          if (therapist) {
            therapist.mobile_verified = true;
            therapist.mobile_verified_at = new Date();
            await (therapist as any).save();
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to mark mobile verified for ${mobile}: ${err.message}`);
    }
  }

  private async handleOtpFailure(requestId: string): Promise<void> {
    await this.otpLogModel.updateOne({ request_id: requestId }, { status: 'failed' });
  }
}
