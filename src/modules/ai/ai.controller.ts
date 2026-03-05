import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AiService } from "./ai.service";
// import { AuthGuard } from '@nestjs/passport'; // TODO: Enable in prod

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  async chat(@Body() body: { prompt: string }) {
    const response = await this.aiService.chat(body.prompt, "general");
    return { response };
  }

  @Post("consult")
  async consult(@Body() body: { query: string; domain?: string }) {
    const response = await this.aiService.chat(body.query, "medical");
    return {
      success: true,
      data: {
        response: response,
      },
    };
  }
}
