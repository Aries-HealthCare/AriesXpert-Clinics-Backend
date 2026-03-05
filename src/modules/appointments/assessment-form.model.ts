import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import * as mongoose from "mongoose";

export enum QuestionType {
  TEXT = "text",
  LONG_TEXT = "longText",
  NUMBER = "number",
  SINGLE_CHOICE = "singleChoice",
  MULTIPLE_CHOICE = "multipleChoice",
  DATE = "date",
  SCALE = "scale",
  BOOLEAN = "boolean",
  LINE_BREAK = "lineBreak",
  FILE = "file",
}

@Schema({ _id: false })
export class Option {
  @Prop({ required: true })
  label: string;

  @Prop()
  value: string;

  @Prop()
  order: number;
}

@Schema({ _id: false })
export class Question {
  @Prop({ required: true })
  questionText: string;

  @Prop({ type: String, enum: QuestionType, required: true })
  questionType: QuestionType;

  @Prop({ default: false })
  required: boolean;

  @Prop({ required: true })
  order: number;

  @Prop({ type: [String] })
  options?: string[];

  @Prop()
  scaleMin?: number;

  @Prop()
  scaleMax?: number;

  @Prop()
  group?: string;

  @Prop()
  helpText?: string;

  @Prop()
  placeholder?: string;
}

@Schema({ timestamps: true })
export class AssessmentForm extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "TreatmentType" })
  treatmentType: ObjectId;

  @Prop({ required: true, trim: true })
  visitType: string; // e.g., "First Assessment", "Follow-up", "Regular Visit"

  @Prop({ type: [Question], required: true })
  questions: Question[];

  @Prop({ type: String, default: "active" })
  status: string; // active, inactive, archived

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  createdBy: ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  updatedBy?: ObjectId;

  @Prop()
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const AssessmentFormSchema =
  SchemaFactory.createForClass(AssessmentForm);

// Indexes for faster queries
AssessmentFormSchema.index({ treatmentType: 1, visitType: 1, isActive: 1 });
AssessmentFormSchema.index({ isDeleted: 1, isActive: 1 });
