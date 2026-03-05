import { Controller, Get, Put, Body, UseGuards, Param } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(":key")
  findByKey(@Param("key") key: string) {
    return this.settingsService.findByKey(key);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put()
  update(@Body() body: { key: string; value: any; description?: string }) {
    // In a real app, check for 'admin' role here
    return this.settingsService.update(body.key, body.value, body.description);
  }
}
