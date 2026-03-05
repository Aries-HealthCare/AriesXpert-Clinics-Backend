import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("integrations/google-meet")
export class GoogleMeetController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getConfig() {
    const existing = (await this.settingsService.findByKey("google_meet")) || {
      enabled: false,
      credentials: {
        clientId: null,
        clientSecret: null,
        serviceAccountJson: null,
      },
    };

    const isConfigured =
      !!existing.credentials?.clientId &&
      !!existing.credentials?.clientSecret &&
      !!existing.credentials?.serviceAccountJson;

    const maskedSecret =
      existing.credentials?.clientSecret &&
      existing.credentials.clientSecret.length > 5
        ? "********"
        : existing.credentials?.clientSecret;
    const maskedJson =
      existing.credentials?.serviceAccountJson &&
      existing.credentials.serviceAccountJson.length > 5
        ? "********"
        : existing.credentials?.serviceAccountJson;

    return {
      data: {
        enabled: !!existing.enabled,
        isConfigured,
        credentials: {
          clientId: existing.credentials?.clientId || null,
          clientSecret: maskedSecret || null,
          serviceAccountJson: maskedJson || null,
        },
      },
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  async saveConfig(
    @Body()
    body: {
      credentials?: {
        clientId?: string;
        clientSecret?: string;
        serviceAccountJson?: string;
      };
    },
  ) {
    const current = (await this.settingsService.findByKey("google_meet")) || {
      enabled: false,
      credentials: {
        clientId: null,
        clientSecret: null,
        serviceAccountJson: null,
      },
    };

    const next = {
      enabled: current.enabled,
      credentials: {
        clientId: body.credentials?.clientId ?? current.credentials?.clientId,
        clientSecret:
          body.credentials?.clientSecret ?? current.credentials?.clientSecret,
        serviceAccountJson:
          body.credentials?.serviceAccountJson ??
          current.credentials?.serviceAccountJson,
      },
    };

    await this.settingsService.update(
      "google_meet",
      next,
      "Google Meet Integration",
    );
    return { success: true };
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("toggle")
  async toggle(@Body() body: { enabled: boolean }) {
    const current = (await this.settingsService.findByKey("google_meet")) || {
      enabled: false,
      credentials: {
        clientId: null,
        clientSecret: null,
        serviceAccountJson: null,
      },
    };
    const next = {
      enabled: !!body.enabled,
      credentials: current.credentials,
    };
    await this.settingsService.update(
      "google_meet",
      next,
      "Google Meet Integration",
    );
    return { success: true };
  }
}
