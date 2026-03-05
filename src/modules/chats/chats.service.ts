import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Chat } from "./schemas/chat.schema";
import { Message } from "./schemas/message.schema";

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createOrGetChat(participants: string[], department?: string) {
    // For direct chats, check if one already exists with these exact participants
    if (participants.length === 2) {
      const existingChat = await this.chatModel
        .findOne({
          participants: { $all: participants, $size: 2 },
          type: "direct",
        })
        .populate("participants", "name email role avatar");

      if (existingChat) {
        return existingChat;
      }
    }

    const newChat = new this.chatModel({
      participants,
      type: "direct",
      department,
    });
    return (await newChat.save()).populate(
      "participants",
      "name email role avatar",
    );
  }

  async getUserChats(userId: string) {
    return this.chatModel
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "name email role avatar")
      .exec();
  }

  async getMessages(chatId: string) {
    return this.messageModel
      .find({ chatId })
      .sort({ createdAt: 1 })
      .populate("senderId", "name avatar")
      .exec();
  }

  async sendMessage(chatId: string, senderId: string, content: string) {
    const message = await this.messageModel.create({
      chatId,
      senderId,
      content,
      readBy: [senderId],
    });

    await this.chatModel.findByIdAndUpdate(chatId, {
      lastMessage: {
        content,
        senderId,
        createdAt: new Date(),
      },
      updatedAt: new Date(),
    });

    return message.populate("senderId", "name avatar");
  }
}
