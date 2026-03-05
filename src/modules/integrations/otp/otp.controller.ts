import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { OTPService } from "./otp.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("OTP")
@Controller("auth/otp")
export class OTPController {
  constructor(private readonly otpService: OTPService) {}

  @Post("send")
  @ApiOperation({ summary: "Send OTP to mobile number" })
  async sendOTP(
    @Body("mobileNo") mobileNo: string,
    @Body("countryCode") countryCode: string = "91",
  ) {
    const result = await this.otpService.sendOTP(mobileNo, countryCode);
    if (!result.success) {
      throw new HttpException(
        result.error || "Failed to send OTP",
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @Post("resend")
  @ApiOperation({ summary: "Resend OTP to mobile number" })
  async resendOTP(
    @Body("mobileNo") mobileNo: string,
    @Body("countryCode") countryCode: string = "91",
    @Body("retryType") retryType: string = "text",
  ) {
    const result = await this.otpService.resendOTP(
      mobileNo,
      countryCode,
      retryType,
    );
    if (!result.success) {
      throw new HttpException(
        result.error || "Failed to resend OTP",
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @Post("verify")
  @ApiOperation({ summary: "Verify OTP" })
  async verifyOTP(
    @Body("mobileNo") mobileNo: string,
    @Body("otp") otp: string,
    @Body("countryCode") countryCode: string = "91",
  ) {
    const result = await this.otpService.verifyOTP(mobileNo, otp, countryCode);
    if (!result.success) {
      throw new HttpException(
        result.error || "Failed to verify OTP",
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }
}
