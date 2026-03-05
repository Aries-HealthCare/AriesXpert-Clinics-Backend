/**
 * WhatsApp Event Service - Event-Driven Triggers
 * File: src/modules/whatsapp/services/whatsapp-event.service.ts
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { OnEvent } from "@nestjs/event-emitter";
import { WhatsAppService } from "./whatsapp.service";
import { WhatsAppTemplateService } from "./whatsapp-template.service";
import { MessageType } from "../schemas/whatsapp-message-log.schema";

export enum WhatsAppEventType {
  // Lead Events
  LEAD_CREATED = "whatsapp.lead.created",
  LEAD_ASSIGNED = "whatsapp.lead.assigned",
  LEAD_CONVERTED = "whatsapp.lead.converted",
  LEAD_REJECTED = "whatsapp.lead.rejected",

  // Appointment Events
  APPOINTMENT_SCHEDULED = "whatsapp.appointment.scheduled",
  APPOINTMENT_REMINDER = "whatsapp.appointment.reminder",
  APPOINTMENT_CONFIRMATION = "whatsapp.appointment.confirmation",
  APPOINTMENT_COMPLETED = "whatsapp.appointment.completed",
  APPOINTMENT_RESCHEDULED = "whatsapp.appointment.rescheduled",
  APPOINTMENT_CANCELLED = "whatsapp.appointment.cancelled",

  // Payment Events
  PAYMENT_INITIATED = "whatsapp.payment.initiated",
  PAYMENT_SUCCESSFUL = "whatsapp.payment.successful",
  PAYMENT_FAILED = "whatsapp.payment.failed",
  PAYMENT_REMINDER = "whatsapp.payment.reminder",
  INVOICE_GENERATED = "whatsapp.invoice.generated",

  // Wallet Events
  WALLET_UPDATED = "whatsapp.wallet.updated",
  WALLET_TRANSFER = "whatsapp.wallet.transfer",

  // SOS Events
  SOS_ALERT = "whatsapp.sos.alert",
  SOS_RESPONSE = "whatsapp.sos.response",

  // Broadcast Events
  BROADCAST_STARTED = "whatsapp.broadcast.started",
  BROADCAST_COMPLETED = "whatsapp.broadcast.completed",

  // Therapist Alignment Events
  THERAPIST_ALIGNMENT = "whatsapp.therapist.alignment",

  // Employee Events
  EMPLOYEE_REGISTRATION = "whatsapp.employee.registration",
  EMPLOYEE_ADDED = "whatsapp.employee.added",

  // Telehealth Events
  TELEHEALTH_INVITE = "whatsapp.telehealth.invite",
  TELEHEALTH_LINK_SHARED = "whatsapp.telehealth.link_shared",

  // AI Events
  AI_FOLLOWUP = "whatsapp.ai.followup",

  // General Events
  REMINDER = "whatsapp.reminder",
  GENERAL_NOTIFICATION = "whatsapp.notification",

  // Treatment Module Events
  PACKAGE_PURCHASED = "whatsapp.package.purchased",
  TREATMENT_COMPLETED = "whatsapp.treatment.completed",
}

export interface WhatsAppEventPayload {
  type: WhatsAppEventType;
  phoneNumber: string;
  templateName: string;
  variables?: Record<string, any>;
  userId?: string;
  leadId?: string;
  patientId?: string;
  appointmentId?: string;
  transactionId?: string;
  priority?: "high" | "normal" | "low";
  delay?: number; // milliseconds
  metadata?: Record<string, any>;
}

@Injectable()
export class WhatsAppEventService {
  private readonly logger = new Logger(WhatsAppEventService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private whatsAppService: WhatsAppService,
    private templateService: WhatsAppTemplateService,
  ) { }

  /**
   * Emit WhatsApp event that triggers message sending
   */
  async emitWhatsAppEvent(payload: WhatsAppEventPayload): Promise<void> {
    try {
      this.logger.log(
        `Emitting WhatsApp event: ${payload.type} to ${payload.phoneNumber}`,
      );

      // Use event emitter with priority
      const options = {
        promisify: true,
      };

      await this.eventEmitter.emitAsync(payload.type, payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit WhatsApp event: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Lead Event Handlers
   */
  @OnEvent(WhatsAppEventType.LEAD_CREATED)
  async handleLeadCreated(payload: WhatsAppEventPayload) {
    try {
      // Send notification to manager/lead owner
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "lead_created_notification",
        variables: payload.variables,
        userId: payload.userId,
        leadId: payload.leadId,
        triggerEvent: "LEAD_CREATION",
      });

      this.logger.log(
        `Lead creation notification sent to ${payload.phoneNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle lead created event: ${error.message}`,
        error,
      );
    }
  }

  @OnEvent(WhatsAppEventType.LEAD_ASSIGNED)
  async handleLeadAssigned(payload: WhatsAppEventPayload) {
    try {
      // Send to assigned therapist
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "lead_assigned_notification",
        variables: payload.variables,
        userId: payload.userId,
        leadId: payload.leadId,
        triggerEvent: "LEAD_ASSIGNMENT",
      });

      this.logger.log(
        `Lead assignment notification sent to ${payload.phoneNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle lead assigned event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Appointment Event Handlers
   */
  @OnEvent(WhatsAppEventType.APPOINTMENT_SCHEDULED)
  async handleAppointmentScheduled(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "appointment_scheduled",
        variables: payload.variables,
        appointmentId: payload.appointmentId,
        patientId: payload.patientId,
        triggerEvent: "APPOINTMENT_SCHEDULED",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle appointment scheduled event: ${error.message}`,
        error,
      );
    }
  }

  @OnEvent(WhatsAppEventType.APPOINTMENT_REMINDER)
  async handleAppointmentReminder(payload: WhatsAppEventPayload) {
    try {
      // Send reminder with interactive buttons (confirm/reschedule/cancel)
      await this.whatsAppService.sendInteractiveButtonMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.INTERACTIVE_BUTTON,
        text:
          payload.variables?.reminderText || "Your appointment is coming up!",
        buttonPayloads: [
          {
            id: "confirm",
            title: "Confirm ✓",
            payload: "appointment_confirmed",
          },
          {
            id: "reschedule",
            title: "Reschedule",
            payload: "appointment_reschedule",
          },
          { id: "cancel", title: "Cancel", payload: "appointment_cancel" },
        ],
        appointmentId: payload.appointmentId,
        triggerEvent: "APPOINTMENT_REMINDER",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle appointment reminder event: ${error.message}`,
        error,
      );
    }
  }

  @OnEvent(WhatsAppEventType.APPOINTMENT_COMPLETED)
  async handleAppointmentCompleted(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "appointment_completed",
        variables: payload.variables,
        appointmentId: payload.appointmentId,
        triggerEvent: "APPOINTMENT_COMPLETED",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle appointment completed event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Payment Event Handlers
   */
  @OnEvent(WhatsAppEventType.PAYMENT_SUCCESSFUL)
  async handlePaymentSuccess(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "payment_receipt",
        variables: payload.variables,
        transactionId: payload.transactionId,
        triggerEvent: "PAYMENT_RECEIPT",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle payment success event: ${error.message}`,
        error,
      );
    }
  }

  @OnEvent(WhatsAppEventType.INVOICE_GENERATED)
  async handleInvoiceGenerated(payload: WhatsAppEventPayload) {
    try {
      // Send invoice as document or button-based message
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "invoice_generated",
        variables: payload.variables,
        transactionId: payload.transactionId,
        triggerEvent: "INVOICE_GENERATED",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle invoice generated event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * SOS Event Handlers
   */
  @OnEvent(WhatsAppEventType.SOS_ALERT)
  async handleSOSAlert(payload: WhatsAppEventPayload) {
    try {
      // Send location-based SOS alert with high priority
      await this.whatsAppService.sendLocationMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.LOCATION,
        location: {
          latitude: payload.variables?.latitude,
          longitude: payload.variables?.longitude,
          name: payload.variables?.locationName || "Emergency Location",
        },
        userId: payload.userId,
        triggerEvent: "SOS_ALERT",
      });

      // Also send text notification
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "sos_alert",
        variables: payload.variables,
        userId: payload.userId,
        triggerEvent: "SOS_ALERT",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle SOS alert event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Broadcast Event Handlers
   */
  @OnEvent(WhatsAppEventType.BROADCAST_STARTED)
  async handleBroadcastStarted(payload: WhatsAppEventPayload) {
    try {
      // Queue broadcast message
      await this.whatsAppService.queueMessage(
        {
          phoneNumber: payload.phoneNumber,
          messageType: MessageType.TEMPLATE,
          templateName: payload.templateName || "broadcast_message",
          variables: payload.variables,
          campaignId: payload.metadata?.campaignId,
          triggerEvent: "BROADCAST",
        },
        payload.delay,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle broadcast started event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Therapist Alignment Event Handlers
   */
  @OnEvent(WhatsAppEventType.THERAPIST_ALIGNMENT)
  async handleTherapistAlignment(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "therapist_alignment",
        variables: payload.variables,
        triggerEvent: "THERAPIST_ALIGNMENT",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle therapist alignment event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Employee Event Handlers
   */
  @OnEvent(WhatsAppEventType.EMPLOYEE_REGISTRATION)
  async handleEmployeeRegistration(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "employee_registration",
        variables: payload.variables,
        userId: payload.userId,
        triggerEvent: "EMPLOYEE_REGISTRATION",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle employee registration event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Telehealth Event Handlers
   */
  @OnEvent(WhatsAppEventType.TELEHEALTH_INVITE)
  async handleTelehealthInvite(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendInteractiveButtonMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.INTERACTIVE_BUTTON,
        text: "You have a telehealth appointment scheduled",
        buttonPayloads: [
          {
            id: "join_now",
            title: "Join Now",
            payload: payload.variables?.meetingLink,
          },
          { id: "reschedule", title: "Reschedule", payload: "reschedule" },
        ],
        triggerEvent: "TELEHEALTH_INVITE",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle telehealth invite event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * AI Followup Event Handler
   */
  @OnEvent(WhatsAppEventType.AI_FOLLOWUP)
  async handleAIFollowup(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "ai_followup",
        variables: payload.variables,
        patientId: payload.patientId,
        triggerEvent: "AI_FOLLOWUP",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle AI followup event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Generic Reminder Handler
   */
  @OnEvent(WhatsAppEventType.REMINDER)
  async handleReminder(payload: WhatsAppEventPayload) {
    try {
      await this.whatsAppService.sendTemplateMessage({
        phoneNumber: payload.phoneNumber,
        messageType: MessageType.TEMPLATE,
        templateName: payload.templateName || "general_reminder",
        variables: payload.variables,
        userId: payload.userId,
        triggerEvent: "REMINDER",
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle reminder event: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics() {
    try {
      // Import WhatsAppMessageLog if not already available
      const messageLogStats = {
        totalSent: 0,
        totalDelivered: 0,
        totalRead: 0,
        totalFailed: 0,
        deliveryRate: 0,
        readRate: 0,
        dailyStats: [],
        templateStats: [],
      };

      // Return default statistics structure
      // In production, this would query actual message logs from MongoDB
      return messageLogStats;
    } catch (error) {
      this.logger.error(
        `Failed to get event statistics: ${error.message}`,
        error,
      );
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalRead: 0,
        totalFailed: 0,
        deliveryRate: 0,
        readRate: 0,
        dailyStats: [],
        templateStats: [],
      };
    }
  }
}
