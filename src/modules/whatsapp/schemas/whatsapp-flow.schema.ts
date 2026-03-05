import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type WhatsAppFlowDocument = WhatsAppFlow & Document;

@Schema({ timestamps: true })
export class WhatsAppFlow {
  @Prop({ required: true })
  name: string;

  @Prop({ default: "draft" })
  status: "draft" | "active" | "paused" | "archived";

  @Prop({ type: [Object], default: [] })
  nodes: {
    id: string;
    type: string; // trigger, message, button, condition, delay, action, ai, input
    position: { x: number; y: number };
    data: any;
  }[];

  @Prop({ type: [Object], default: [] })
  edges: {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }[];

  @Prop({ type: [String], default: [] })
  triggerKeywords: string[];

  @Prop({ default: 'keyword' })
  triggerType: string;

  @Prop({ default: 0 })
  triggerCount: number;

  @Prop({ default: 0 })
  version: number;

  @Prop({ type: Object, default: { started: 0, completed: 0, dropped: 0 } })
  analytics: {
    started: number;
    completed: number;
    dropped: number;
  };
}

export const WhatsAppFlowSchema = SchemaFactory.createForClass(WhatsAppFlow);
WhatsAppFlowSchema.index({ status: 1 });
WhatsAppFlowSchema.index({ triggerKeywords: 1 });
