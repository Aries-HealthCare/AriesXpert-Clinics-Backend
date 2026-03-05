/**
 * WhatsApp AI Service - Auto-Reply with LLM Integration
 * File: src/modules/whatsapp/services/whatsapp-ai.service.ts
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
// import { GoogleGenkit } from '@google/genkit'; // Add when package available

import {
  WhatsAppSettings,
  WhatsAppSettingsDocument,
} from "../schemas/whatsapp-settings.schema";
import {
  WhatsAppMessageLog,
  WhatsAppMessageLogDocument,
} from "../schemas/whatsapp-message-log.schema";
import { WhatsAppService } from "./whatsapp.service";
import { MessageType } from "../schemas/whatsapp-message-log.schema";

interface AutoReplyContext {
  senderPhone: string;
  messageId: string;
  rawContext?: any;
  userHistory?: WhatsAppMessageLogDocument[];
  userProfile?: any;
}

@Injectable()
export class WhatsAppAIService {
  private readonly logger = new Logger(WhatsAppAIService.name);
  private genkit: any;
  private settings: WhatsAppSettingsDocument;

  constructor(
    @InjectModel(WhatsAppSettings.name)
    private settingsModel: Model<WhatsAppSettingsDocument>,
    @InjectModel(WhatsAppMessageLog.name)
    private messageLogModel: Model<WhatsAppMessageLogDocument>,
    private whatsAppService: WhatsAppService,
  ) {
    this.initializeGenkit();
  }

  /**
   * Initialize Google Genkit
   */
  private async initializeGenkit() {
    try {
      // Initialize Genkit when package becomes available
      // this.genkit = new GoogleGenkit({
      //   apiKey: process.env.GOOGLE_GENKIT_API_KEY,
      // });

      this.settings = await this.settingsModel.findOne({ isActive: true });
      this.logger.log("Genkit initialized successfully");
    } catch (error) {
      this.logger.error(`Failed to initialize Genkit: ${error.message}`, error);
    }
  }

  /**
   * Generate AI auto-reply to user message
   */
  async generateAutoReply(
    userMessage: string,
    context: AutoReplyContext,
  ): Promise<string | null> {
    try {
      if (!this.settings?.aiSettings?.enabled) {
        return null;
      }

      // Check confidence threshold
      const intent = await this.classifyIntent(userMessage);
      if (intent.confidence < this.settings.aiSettings.confidenceThreshold) {
        if (this.settings.aiSettings.autoReplyOnNoMatch) {
          return this.getDefaultFallbackResponse();
        }
        return null;
      }

      // Get user context for personalized response
      const userContext = await this.getUserContext(context.senderPhone);

      // Generate contextual response
      const response = await this.generateContextualResponse(
        userMessage,
        intent,
        userContext,
        context,
      );

      // Log the interaction
      await this.logAIInteraction(
        context.senderPhone,
        userMessage,
        response,
        intent,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to generate auto-reply: ${error.message}`,
        error,
      );
      return null;
    }
  }

  /**
   * Classify user message intent
   */
  private async classifyIntent(
    message: string,
  ): Promise<{ intent: string; confidence: number; category: string }> {
    try {
      const prompt = `Classify the following WhatsApp message into one of these intents: 
      - appointment_query
      - payment_inquiry
      - prescription_request
      - medical_emergency
      - appointment_cancellation
      - billing_issue
      - general_inquiry
      - feedback
      
      Message: "${message}"
      
      Respond with JSON: { "intent": "...", "confidence": 0.0-1.0, "category": "..." }`;

      // Use Genkit to classify
      const result = await this.callGeminiAPI(prompt);
      const parsed = JSON.parse(result);

      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        category: parsed.category || "general",
      };
    } catch (error) {
      this.logger.warn(`Failed to classify intent: ${error.message}`);
      return {
        intent: "unknown",
        confidence: 0,
        category: "general",
      };
    }
  }

  /**
   * Get user context for personalized responses
   */
  private async getUserContext(phoneNumber: string) {
    try {
      // Get recent message history
      const recentMessages = await this.messageLogModel
        .find({ recipientPhoneNumber: phoneNumber })
        .sort({ createdAt: -1 })
        .limit(10);

      // Could also fetch user profile from other modules
      return {
        recentMessages: recentMessages.map((m) => ({
          content: m.content,
          type: m.messageType,
          createdAt: (m as any).createdAt || (m as any).readAt || new Date(),
        })),
        conversationHistory: recentMessages.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get user context: ${error.message}`, error);
      return { recentMessages: [], conversationHistory: 0 };
    }
  }

  /**
   * Generate contextual response using LLM
   */
  private async generateContextualResponse(
    userMessage: string,
    intent: any,
    userContext: any,
    context: AutoReplyContext,
  ): Promise<string> {
    try {
      const systemPrompt = `You are a helpful healthcare assistant for AriesXpert. 
      Your role is to assist users with:
      - Appointment scheduling and queries
      - Payment information
      - General health inquiries
      - Prescription requests
      - Emergency support escalation
      
      Important guidelines:
      - Keep responses concise (under 160 characters for WhatsApp readability)
      - Be empathetic and professional
      - For emergencies, escalate immediately
      - Provide clear next steps
      - Use the user's name if available
      
      User Context:
      - Recent messages: ${JSON.stringify(userContext.recentMessages?.slice(0, 3))}
      - Message intent: ${intent.intent}
      
      User Message: "${userMessage}"
      
      Generate a helpful, concise response appropriate for WhatsApp.`;

      const response = await this.callGeminiAPI(systemPrompt);

      return response.trim().substring(0, 1000); // Ensure reasonable length
    } catch (error) {
      this.logger.error(
        `Failed to generate contextual response: ${error.message}`,
        error,
      );
      return this.getDefaultFallbackResponse();
    }
  }

  /**
   * Call Gemini API
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      // This would use the actual Genkit/Gemini integration
      // For now, returning placeholder
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_GENKIT_API_KEY || "",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        },
      );

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      this.logger.error(`Gemini API call failed: ${error.message}`, error);
      return "";
    }
  }

  /**
   * Get default fallback response
   */
  private getDefaultFallbackResponse(): string {
    return `Thank you for your message. We're here to help! Please select an option or contact our support team at support@ariesxpert.com for immediate assistance.`;
  }

  /**
   * Log AI interaction for analytics
   */
  private async logAIInteraction(
    phoneNumber: string,
    userMessage: string,
    aiResponse: string,
    intent: any,
  ): Promise<void> {
    try {
      // Could be stored in a dedicated AI interactions collection
      this.logger.log(
        `AI Interaction logged - Phone: ${phoneNumber}, Intent: ${intent.intent}, Confidence: ${intent.confidence}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log AI interaction: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Route complex queries to human support
   */
  async escalateToHumanSupport(
    phoneNumber: string,
    reason: string,
    context: any,
  ): Promise<void> {
    try {
      this.logger.log(
        `Escalating to human support - Phone: ${phoneNumber}, Reason: ${reason}`,
      );

      // Send escalation notification
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: "+918000770770", // Support team number - would come from settings
        messageType: MessageType.TEMPLATE,
        templateName: "support_escalation",
        variables: {
          customerPhone: phoneNumber,
          reason,
          timestamp: new Date().toISOString(),
        },
        triggerEvent: "SUPPORT_ESCALATION",
      });

      // Send customer notification
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: "support_acknowledgment",
        variables: {
          estimatedWaitTime: "5-10 minutes",
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to escalate to human support: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Get AI metrics
   */
  async getAIMetrics() {
    try {
      const totalInteractions = await this.messageLogModel.countDocuments({
        triggerEvent: "AI_FOLLOWUP",
      });

      return {
        totalInteractions,
        aiEnabled: this.settings?.aiSettings?.enabled || false,
        confidenceThreshold:
          this.settings?.aiSettings?.confidenceThreshold || 0.7,
      };
    } catch (error) {
      this.logger.error(`Failed to get AI metrics: ${error.message}`, error);
      return {};
    }
  }
}
