import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  WhatsAppFlow,
  WhatsAppFlowDocument,
} from "../schemas/whatsapp-flow.schema";
import { WhatsAppService } from "./whatsapp.service";
import {
  WhatsAppContact,
  WhatsAppContactDocument,
} from "../schemas/whatsapp-contact.schema";
import {
  WhatsAppSession,
  WhatsAppSessionDocument,
} from "../schemas/whatsapp-session.schema";
import { MessageType } from "../schemas/whatsapp-message-log.schema";

@Injectable()
export class WhatsAppFlowService {
  private readonly logger = new Logger(WhatsAppFlowService.name);

  constructor(
    @InjectModel(WhatsAppFlow.name)
    private flowModel: Model<WhatsAppFlowDocument>,
    @InjectModel(WhatsAppContact.name)
    private contactModel: Model<WhatsAppContactDocument>,
    @InjectModel(WhatsAppSession.name)
    private sessionModel: Model<WhatsAppSessionDocument>,
    private whatsAppService: WhatsAppService,
  ) { }

  /**
   * Handle incoming message for chatbot execution
   */
  async handleMessage(
    phoneNumber: string,
    message: string,
    type: string,
  ): Promise<boolean> {
    try {
      // 1. Check if user is in an active session
      const session = await this.sessionModel.findOne({
        phoneNumber,
        isPaused: false,
      });

      if (session) {
        return await this.continueFlow(phoneNumber, session, message, type);
      }

      // 2. Check for keywords to start a new flow
      const flow = await this.flowModel.findOne({
        triggerKeywords: { $in: [message.toLowerCase()] },
        status: "Published",
      });

      if (flow) {
        this.logger.log(`Starting flow "${flow.name}" for ${phoneNumber}`);
        await this.startFlow(phoneNumber, flow);
        return true;
      }

      return false; // No flow handled
    } catch (error) {
      this.logger.error(`Flow execution error: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Start a new flow
   */
  private async startFlow(phoneNumber: string, flow: WhatsAppFlowDocument) {
    const startNode = flow.nodes[0]; // Assuming first node is start
    if (!startNode) return;

    // Create session
    const session = await this.sessionModel.findOneAndUpdate(
      { phoneNumber },
      {
        phoneNumber,
        flowId: flow._id,
        currentNodeId: startNode.id,
        variables: {},
        isPaused: false,
        stepsCompleted: 0,
        lastInteractionAt: new Date(),
      },
      { upsert: true, new: true },
    );

    await this.processNode(phoneNumber, startNode, flow, session);
  }

  /**
   * Continue existing flow
   */
  private async continueFlow(
    phoneNumber: string,
    session: WhatsAppSessionDocument,
    input: string,
    type: string,
  ): Promise<boolean> {
    const flow = await this.flowModel.findById(session.flowId);
    if (!flow) {
      await this.sessionModel.deleteOne({ _id: session._id });
      return false;
    }

    const currentNode = flow.nodes.find((n) => n.id === session.currentNodeId);

    // Handle Input for specific nodes
    if (
      currentNode?.type === "ASK_QUESTION" ||
      currentNode?.type === "SAVE_ANSWER"
    ) {
      // Save answer
      const varName = currentNode.data.variableName || "answer";
      session.variables[varName] = input;
      // Also update contact if mapped
      if (currentNode.data.mapToContactField) {
        await this.contactModel.updateOne(
          { phoneNumber },
          { [currentNode.data.mapToContactField]: input },
        );
      }

      await this.sessionModel.updateOne(
        { _id: session._id },
        {
          variables: session.variables,
          lastInteractionAt: new Date(),
        },
      );

      // Move to next node
      await this.moveToNextNode(phoneNumber, currentNode.id, flow, session);
      return true;
    }

    // End session if stuck
    await this.sessionModel.deleteOne({ _id: session._id });
    return false;
  }

  private async moveToNextNode(
    phoneNumber: string,
    currentNodeId: string,
    flow: WhatsAppFlowDocument,
    session: WhatsAppSessionDocument,
  ) {
    const edge = flow.edges.find((e) => e.source === currentNodeId);
    if (edge) {
      const nextNode = flow.nodes.find((n) => n.id === edge.target);
      if (nextNode) {
        session.currentNodeId = nextNode.id;
        session.stepsCompleted += 1;
        await session.save();
        await this.processNode(phoneNumber, nextNode, flow, session);
      }
    } else {
      // Flow complete
      await this.sessionModel.deleteOne({ _id: session._id });
    }
  }

  /**
   * Process a single node
   */
  private async processNode(
    phoneNumber: string,
    node: any,
    flow: WhatsAppFlowDocument,
    session: WhatsAppSessionDocument,
  ) {
    this.logger.log(
      `Processing node ${node.type} (${node.id}) for ${phoneNumber}`,
    );

    // Replace variables in text
    const replaceVars = (text: string) => {
      if (!text) return "";
      return text.replace(
        /{{(.*?)}}/g,
        (_, key) => session.variables[key.trim()] || "",
      );
    };

    switch (node.type) {
      case "SEND_TEXT":
        await this.whatsAppService.sendTextMessage({
          phoneNumber,
          messageType: MessageType.TEXT,
          text: replaceVars(node.data.text),
        });
        break;

      case "SEND_BUTTONS":
        await this.whatsAppService.sendInteractiveButtonMessage({
          phoneNumber,
          messageType: MessageType.INTERACTIVE_BUTTON,
          text: replaceVars(node.data.text),
          buttonPayloads: node.data.buttons, // [{id: '1', title: 'Yes'}, ...]
        });
        break;

      case "SEND_LIST":
        await this.whatsAppService.sendListMessage(
          phoneNumber,
          replaceVars(node.data.text),
          replaceVars(node.data.buttonText),
          node.data.sections, // [{title: 'Section 1', rows: [...]}, ...]
        );
        break;

      case "ASK_QUESTION":
        await this.whatsAppService.sendTextMessage({
          phoneNumber,
          messageType: MessageType.TEXT,
          text: replaceVars(node.data.question),
        });
        // Stop here, wait for input
        return;

      case "CONDITION_LOGIC":
        const variable = node.data.variable;
        const value = session.variables[variable];
        const condition = node.data.condition; // 'equals', 'contains'
        const targetValue = node.data.value;

        let match = false;
        if (condition === "equals") match = value === targetValue;
        else if (condition === "contains") match = value?.includes(targetValue);

        // Find edge based on match — uses sourceHandle from visual builder
        const handleId = match ? "yes" : "no";
        const edge = flow.edges.find(
          (e) => e.source === node.id && e.sourceHandle === handleId,
        );

        if (edge) {
          const nextNode = flow.nodes.find((n) => n.id === edge.target);
          if (nextNode) {
            session.currentNodeId = nextNode.id;
            await session.save();
            await this.processNode(phoneNumber, nextNode, flow, session);
            return;
          }
        }
        break;

      case "DELAY":
        // We can't easily block thread, so we should ideally schedule a job.
        // For MVP/Phase 1, we just do a short timeout if < 5s, else we might need a robust scheduler.
        // Or we simply ignore delay for sync processing and rely on user interaction.
        // Let's assume short delay for typing simulation.
        await new Promise((r) =>
          setTimeout(r, Math.min(node.data.delayMs || 1000, 5000)),
        );
        break;

      case "ASSIGN_AGENT":
        await this.contactModel.updateOne(
          { phoneNumber },
          { assignedTo: node.data.agentId },
        );
        break;

      case "ADD_TAG":
        await this.contactModel.updateOne(
          { phoneNumber },
          { $addToSet: { tags: node.data.tag } },
        );
        break;
    }

    // Automatically move to next node if not waiting for input (ASK_QUESTION stops execution above)
    if (node.type !== "ASK_QUESTION" && node.type !== "CONDITION_LOGIC") {
      await this.moveToNextNode(phoneNumber, node.id, flow, session);
    }
  }
}
