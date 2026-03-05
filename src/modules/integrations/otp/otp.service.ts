import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import axios from "axios";
import { OTPRecord, OTPStatus } from "./otp.model";

@Injectable()
export class OTPService {
  private readonly msg91AuthKey = process.env.MSG91_AUTH_KEY;
  private readonly msg91TemplateId = process.env.MSG91_TEMPLATE_ID;
  private readonly msg91ApiUrl = "https://api.msg91.com/api/v5";

  // Test phone numbers that get fixed OTP
  private readonly testPhones = ["8899221111", "8899331111", "8899441111"];

  constructor(
    @InjectModel(OTPRecord.name)
    private otpRecordModel: Model<OTPRecord>,
  ) {}

  /**
   * Send OTP to user's mobile number
   */
  async sendOTP(
    mobileNo: string,
    countryCode: string = "91",
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate phone number
      if (!mobileNo || mobileNo.length < 10) {
        return {
          success: false,
          error: "Invalid mobile number",
        };
      }

      let url: string;

      // Use fixed OTP for test numbers
      if (this.testPhones.includes(mobileNo)) {
        url = `${this.msg91ApiUrl}/otp?template_id=${this.msg91TemplateId}&mobile=+${countryCode}${mobileNo}&authkey=${this.msg91AuthKey}&otp_length=6&otp=123456`;
      } else {
        url = `${this.msg91ApiUrl}/otp?template_id=${this.msg91TemplateId}&mobile=+${countryCode}${mobileNo}&authkey=${this.msg91AuthKey}&otp_length=6`;
      }

      const response = await axios.get(url);

      if (response.data && response.data.type === "success") {
        // Save OTP record
        await this.otpRecordModel.create({
          mobile: mobileNo,
          countryCode,
          status: OTPStatus.SUCCESS,
          requestId: response.data.request_id,
          log: response.data,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        return {
          success: true,
          data: {
            type: "success",
            message: "OTP sent successfully",
            requestId: response.data.request_id,
          },
        };
      }

      // Save failed OTP record
      await this.otpRecordModel.create({
        mobile: mobileNo,
        countryCode,
        status: OTPStatus.FAILED,
        log: response.data,
      });

      return {
        success: false,
        error: "Failed to send OTP",
      };
    } catch (error: any) {
      // Log failed attempt
      await this.otpRecordModel.create({
        mobile: mobileNo,
        countryCode,
        status: OTPStatus.FAILED,
        log: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.message || "Failed to send OTP",
      };
    }
  }

  /**
   * Resend OTP to user
   */
  async resendOTP(
    mobileNo: string,
    countryCode: string = "91",
    retryType: string = "text",
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!mobileNo || mobileNo.length < 10) {
        return {
          success: false,
          error: "Invalid mobile number",
        };
      }

      let url: string;

      if (this.testPhones.includes(mobileNo)) {
        url = `${this.msg91ApiUrl}/otp/retry?authkey=${this.msg91AuthKey}&retrytype=${retryType}&mobile=+${countryCode}${mobileNo}&otp=123456`;
      } else {
        url = `${this.msg91ApiUrl}/otp/retry?authkey=${this.msg91AuthKey}&retrytype=${retryType}&mobile=+${countryCode}${mobileNo}`;
      }

      const response = await axios.get(url);

      if (response.data && response.data.type === "success") {
        // Update OTP record
        const otpRecord = await this.otpRecordModel
          .findOne({ mobile: mobileNo })
          .sort({ createdAt: -1 });

        if (otpRecord) {
          await this.otpRecordModel.updateOne(
            { _id: otpRecord._id },
            { $inc: { resendCount: 1 } },
          );
        } else {
          await this.otpRecordModel.create({
            mobile: mobileNo,
            countryCode,
            status: OTPStatus.SUCCESS,
            requestId: response.data.request_id,
            log: response.data,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });
        }

        return {
          success: true,
          data: {
            type: "success",
            message: "OTP resent successfully",
          },
        };
      }

      return {
        success: false,
        error: "Failed to resend OTP",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to resend OTP",
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    mobileNo: string,
    otp: string,
    countryCode: string = "91",
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!mobileNo || !otp) {
        return {
          success: false,
          error: "Mobile and OTP are required",
        };
      }

      const url = `${this.msg91ApiUrl}/otp/verify?authkey=${this.msg91AuthKey}&mobile=+${countryCode}${mobileNo}&otp=${otp}`;

      const response = await axios.get(url);

      if (response.data && response.data.type === "success") {
        // Mark OTP as verified
        await this.otpRecordModel.updateOne(
          { mobile: mobileNo },
          {
            isVerified: true,
            verifiedAt: new Date(),
          },
          { sort: { createdAt: -1 } },
        );

        return {
          success: true,
          message: "OTP verified successfully",
        };
      }

      return {
        success: false,
        error: "Invalid OTP",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to verify OTP",
      };
    }
  }
}
