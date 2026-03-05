import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "whatsapp",
})
export class WhatsAppGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsAppGateway.name);
  private activeSockets: Map<string, string> = new Map(); // socketId -> userId

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(" ")[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.activeSockets.set(client.id, payload.sub);
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.error(`Connection unauthorized: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.activeSockets.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join-chat")
  handleJoinChat(client: Socket, chatId: string) {
    client.join(`chat:${chatId}`);
    this.logger.log(`Client ${client.id} joined chat ${chatId}`);
  }

  @SubscribeMessage("leave-chat")
  handleLeaveChat(client: Socket, chatId: string) {
    client.leave(`chat:${chatId}`);
  }

  @SubscribeMessage("typing-start")
  handleTypingStart(client: Socket, payload: { chatId: string }) {
    client
      .to(`chat:${payload.chatId}`)
      .emit("typing-start", { userId: this.activeSockets.get(client.id) });
  }

  @SubscribeMessage("typing-stop")
  handleTypingStop(client: Socket, payload: { chatId: string }) {
    client
      .to(`chat:${payload.chatId}`)
      .emit("typing-stop", { userId: this.activeSockets.get(client.id) });
  }

  // Method to push new message to clients
  emitNewMessage(chatId: string, message: any) {
    this.server.to(`chat:${chatId}`).emit("new-message", message);
    // Also notify inbox list if needed
    this.server.emit("inbox-update", { chatId, lastMessage: message });
  }

  emitMessageStatus(chatId: string, messageId: string, status: string) {
    this.server
      .to(`chat:${chatId}`)
      .emit("message-status", { messageId, status });
  }
}
