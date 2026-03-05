import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("integrations/google-maps")
export class GoogleMapsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get()
  async getConfig() {
    const existing = (await this.settingsService.findByKey("google_maps")) || {
      enabled: false,
      apiKey: null,
    };

    const isConfigured = !!existing.apiKey;
    const masked =
      existing.apiKey && existing.apiKey.length > 5
        ? existing.apiKey.slice(0, 5) + "..."
        : existing.apiKey;

    return {
      data: {
        enabled: !!existing.enabled,
        isConfigured,
        credentials: {
          apiKey: masked,
        },
      },
    };
  }

  @Get("mobile-config")
  async getMobileConfig() {
    const existing = (await this.settingsService.findByKey("google_maps")) || {
      enabled: false,
      apiKey: null,
    };

    return {
      data: {
        enabled: !!existing.enabled,
        apiKey: existing.apiKey, // Mobile needs the real key for some clients, though usually native
      },
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  async saveConfig(@Body() body: { apiKey?: string }) {
    const current = (await this.settingsService.findByKey("google_maps")) || {
      enabled: false,
      apiKey: null,
    };
    const next = {
      enabled: current.enabled,
      apiKey: body.apiKey ?? current.apiKey,
    };
    await this.settingsService.update(
      "google_maps",
      next,
      "Google Maps Integration",
    );
    return { success: true };
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("toggle")
  async toggle(@Body() body: { enabled: boolean }) {
    const current = (await this.settingsService.findByKey("google_maps")) || {
      enabled: false,
      apiKey: null,
    };
    const next = {
      enabled: !!body.enabled,
      apiKey: current.apiKey,
    };
    await this.settingsService.update(
      "google_maps",
      next,
      "Google Maps Integration",
    );
    return { success: true };
  }
}
