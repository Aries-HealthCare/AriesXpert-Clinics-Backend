import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("chats")
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async getUserChats(@Request() req) {
    return this.chatsService.getUserChats(req.user.userId);
  }

  @Post()
  async createChat(
    @Body() body: { participantId: string; department?: string },
    @Request() req,
  ) {
    return this.chatsService.createOrGetChat(
      [req.user.userId, body.participantId],
      body.department,
    );
  }

  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    return this.chatsService.getMessages(id);
  }

  @Post(":id/messages")
  async sendMessage(
    @Param("id") id: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    return this.chatsService.sendMessage(id, req.user.userId, body.content);
  }
}
