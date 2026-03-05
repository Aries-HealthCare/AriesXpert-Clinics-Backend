import { Controller, Post, Body, Get, UseGuards, Req, Res, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@nestjs/passport";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { Response } from 'express';

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put("fcm-token")
  updateFCMToken(@Req() req: any, @Body("fcmToken") fcmToken: string) {
    const userId = req.user.id || req.user._id;
    return this.authService.updateFCMToken(userId, fcmToken);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me")

  async getMe(@Req() req: any) {
    const user = req.user;
    let therapistProfile = null;
    if (user.role === "therapist") {
      therapistProfile = await this.authService['therapistsService'].findByUserId(user.id || user._id);
    }

    return {
      success: true,
      message: "Current user session",
      data: {
        user: {
          id: user._id || user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          clinicId: (user as any).clinicId,
          therapistProfile,
        }
      }
    };
  }

  @Post("forgot-password")
  forgotPassword(@Body('email') email: string) {
    if (!email) return { message: "Email is required" };
    return this.authService.forgotPassword(email);
  }

  @Post("reset-password")
  resetPassword(@Body() body: any) {
    const { token, newPassword } = body;
    if (!token || !newPassword) return { message: "Token and new password are required" };
    return this.authService.resetPassword(token, newPassword);
  }

  // C5-FIX: Returns HTML page when user clicks the verification link from email
  @Get("verify-email")
  async verifyEmail(@Req() req: any, @Res() res: Response) {
    const { token } = req.query;
    const ip = req.ip || req.connection.remoteAddress;
    if (!token) {
      res.status(400).type('text/html').send(
        this.authService['buildVerificationHtml'](false, 'Missing Token', 'No verification token was provided. Please use the link from your verification email.')
      );
      return;
    }
    const result = await this.authService.verifyEmail(token, ip);
    if (result.html) {
      res.type('text/html').send(result.html);
    } else {
      res.json(result);
    }
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("request-email-verification")
  requestEmailVerification(@Req() req: any) {
    return this.authService.requestEmailVerification(req.user.id || req.user._id);
  }

  // C4-FIX: Public endpoint (no JWT required) for onboarding email verification
  @Post("request-email-verification-public")
  requestEmailVerificationPublic(@Body() body: any) {
    return this.authService.requestEmailVerificationByEmail(body.email, body.name);
  }
}
