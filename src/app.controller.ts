import { Controller, Get } from "@nestjs/common";

@Controller("version")
export class AppController {
  @Get()
  getVersion() {
    return {
      backend: "nestjs",
      version: "2.0.1",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      message: "AriesXpert NestJS Backend is Active",
    };
  }
}
