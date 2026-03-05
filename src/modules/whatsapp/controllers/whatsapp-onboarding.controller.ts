import { Controller, Post, Body, Get, UseGuards, Query } from "@nestjs/common";
import { WhatsAppOnboardingService } from "../services/whatsapp-onboarding.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("WhatsApp Onboarding")
@Controller("whatsapp/onboarding")
@UseGuards(JwtAuthGuard)
export class WhatsAppOnboardingController {
  constructor(private onboardingService: WhatsAppOnboardingService) {}

  @Post("exchange-token")
  @ApiOperation({
    summary: "Exchange Facebook short-lived token for system user token",
  })
  async exchangeToken(
    @Body() body: { code: string; appId: string; appSecret: string },
  ) {
    // In Embedded Signup, the 'code' is the short-lived user access token
    const longLivedToken = await this.onboardingService.exchangeToken(
      body.code,
      body.appId,
      body.appSecret,
    );
    return { accessToken: longLivedToken };
  }

  @Post("setup")
  @ApiOperation({ summary: "Save WhatsApp setup from Embedded Signup" })
  async saveSetup(
    @Body()
    body: {
      wabaId: string;
      accessToken: string;
      phoneNumberId: string;
      phoneNumber: string;
      businessName: string;
      appId?: string;
      appSecret?: string;
    },
  ) {
    return this.onboardingService.saveSetup(body);
  }

  @Get("phone-numbers")
  @ApiOperation({ summary: "Fetch phone numbers for a WABA" })
  async getPhoneNumbers(
    @Query("wabaId") wabaId: string,
    @Query("accessToken") accessToken: string,
  ) {
    return this.onboardingService.getPhoneNumbers(wabaId, accessToken);
  }
}
