/**
 * WhatsApp Module - Complete Implementation
 * File: src/modules/whatsapp/whatsapp.module.ts
 * Purpose: Core WhatsApp integration module for AriesXpert
 */

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bull";
import { HttpModule } from "@nestjs/axios";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { JwtModule } from "@nestjs/jwt";

// Services
import { WhatsAppService } from "./services/whatsapp.service";
import { WhatsAppTemplateService } from "./services/whatsapp-template.service";
import { WhatsAppWebhookService } from "./services/whatsapp-webhook.service";
import { WhatsAppAIService } from "./services/whatsapp-ai.service";
import { WhatsAppEventService } from "./services/whatsapp-event.service";

// Schemas
import {
  WhatsAppTemplate,
  WhatsAppTemplateSchema,
} from "./schemas/whatsapp-template.schema";
import {
  WhatsAppMessageLog,
  WhatsAppMessageLogSchema,
} from "./schemas/whatsapp-message-log.schema";
import {
  WhatsAppSettings,
  WhatsAppSettingsSchema,
} from "./schemas/whatsapp-settings.schema";
import {
  WhatsAppWebhookEvent,
  WhatsAppWebhookEventSchema,
} from "./schemas/whatsapp-webhook-event.schema";
import {
  WhatsAppNumber,
  WhatsAppNumberSchema,
} from "./schemas/whatsapp-number.schema";
import {
  WhatsAppContact,
  WhatsAppContactSchema,
} from "./schemas/whatsapp-contact.schema";
import {
  WhatsAppAutomation,
  WhatsAppAutomationSchema,
} from "./schemas/whatsapp-automation.schema";
import {
  WhatsAppFlow,
  WhatsAppFlowSchema,
} from "./schemas/whatsapp-flow.schema";
import {
  WhatsAppBroadcast,
  WhatsAppBroadcastSchema,
} from "./schemas/whatsapp-broadcast.schema";
import {
  WhatsAppFunnel,
  WhatsAppFunnelSchema,
} from "./schemas/whatsapp-funnel.schema";
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from "./schemas/whatsapp-session.schema";

// Controllers
import { WhatsAppController } from "./controllers/whatsapp.controller";
import { WhatsAppTemplateController } from "./controllers/whatsapp-template.controller";
import { WhatsAppSettingsController } from "./controllers/whatsapp-settings.controller";
import { WhatsAppOnboardingController } from "./controllers/whatsapp-onboarding.controller";
import { WhatsAppFlowController } from "./controllers/whatsapp-flow.controller";
import { WhatsAppContactController } from "./controllers/whatsapp-contact.controller";

// Consumers
import { WhatsAppMessageConsumer } from "./consumers/whatsapp-message.consumer";
import { WhatsAppWebhookConsumer } from "./consumers/whatsapp-webhook.consumer";
import { WhatsAppBroadcastConsumer } from "./consumers/whatsapp-broadcast.consumer";

// Guards
import { WhatsAppWebhookVerificationGuard } from "./guards/whatsapp-webhook-verification.guard";

// Services
import { WhatsAppOnboardingService } from "./services/whatsapp-onboarding.service";
import { WhatsAppTokenRefreshService } from "./services/whatsapp-token-refresh.service";

// Gateways
import { WhatsAppGateway } from "./gateways/whatsapp.gateway";

import { WhatsAppFlowService } from "./services/whatsapp-flow.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppTemplate.name, schema: WhatsAppTemplateSchema },
      { name: WhatsAppMessageLog.name, schema: WhatsAppMessageLogSchema },
      { name: WhatsAppSettings.name, schema: WhatsAppSettingsSchema },
      { name: WhatsAppWebhookEvent.name, schema: WhatsAppWebhookEventSchema },
      { name: WhatsAppNumber.name, schema: WhatsAppNumberSchema },
      { name: WhatsAppContact.name, schema: WhatsAppContactSchema },
      { name: WhatsAppAutomation.name, schema: WhatsAppAutomationSchema },
      { name: WhatsAppFlow.name, schema: WhatsAppFlowSchema },
      { name: WhatsAppBroadcast.name, schema: WhatsAppBroadcastSchema },
      { name: WhatsAppFunnel.name, schema: WhatsAppFunnelSchema },
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
    BullModule.registerQueue(
      { name: "whatsapp-messages" },
      { name: "whatsapp-webhooks" },
      { name: "whatsapp-broadcasts" },
    ),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
      baseURL:
        process.env.WHATSAPP_API_BASE_URL ||
        "https://graph.facebook.com/v18.0",
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "ariesxpert_secret",
      signOptions: { expiresIn: "1d" },
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    WhatsAppController,
    WhatsAppTemplateController,
    WhatsAppSettingsController,
    WhatsAppOnboardingController,
    WhatsAppFlowController,
    WhatsAppContactController,
  ],
  providers: [
    WhatsAppService,
    WhatsAppTemplateService,
    WhatsAppWebhookService,
    WhatsAppAIService,
    WhatsAppEventService,
    WhatsAppOnboardingService,
    WhatsAppTokenRefreshService,
    WhatsAppFlowService,
    WhatsAppGateway,
    WhatsAppMessageConsumer,
    WhatsAppWebhookConsumer,
    WhatsAppBroadcastConsumer,
    WhatsAppWebhookVerificationGuard,
  ],
  exports: [
    WhatsAppService,
    WhatsAppTemplateService,
    WhatsAppWebhookService,
    WhatsAppAIService,
    WhatsAppEventService,
  ],
})
export class WhatsAppModule { }
