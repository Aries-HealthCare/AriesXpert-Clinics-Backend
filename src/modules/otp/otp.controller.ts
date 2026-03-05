import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';

// To avoid circular dependency, we might need a custom service or use AuthService. 
// We will modify OtpModule to import AuthModule later.
import { AuthService } from '../auth/auth.service';

@Controller('auth')
export class OtpController {
    constructor(
        private readonly otpService: OtpService,
        private readonly authService: AuthService
    ) { }

    @Post('send-otp')
    async sendOtp(@Body() body: any) {
        const { mobile, purpose } = body;
        if (!mobile || !purpose) throw new BadRequestException('Mobile and purpose are required');
        return this.otpService.sendOtp({ mobile, purpose });
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: any) {
        const { mobile, otp, requestId, purpose } = body;
        if (!mobile || !otp || !requestId) throw new BadRequestException('Mobile, otp, and requestId are required');

        // Verify OTP first
        const verification = await this.otpService.verifyOtp({ mobile, otp, requestId, purpose });
        if (!verification.success) {
            throw new BadRequestException('Invalid OTP');
        }

        // Depending on purpose, route to login or just return success
        if (purpose === 'registration' || purpose === 'password_reset' || purpose === 'mobile_verification') {
            return {
                success: true,
                message: "OTP verified successfully",
                data: { verifiedMobile: mobile }
            };
        }

        // Act as login for admin_login, therapist_login, clinic_login, etc.
        return this.authService.otpLogin(mobile);
    }

    @Post('resend-otp')
    async resendOtp(@Body() body: any) {
        const { mobile, retryType } = body;
        if (!mobile) throw new BadRequestException('Mobile is required');
        return this.otpService.resendOtp({ mobile, retryType: retryType || 'text' });
    }
}
