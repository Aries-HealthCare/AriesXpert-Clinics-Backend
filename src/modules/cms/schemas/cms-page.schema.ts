import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CmsPageDocument = CmsPage & Document;

export enum CmsPageType {
  PAGE = "PAGE",
  BLOG = "BLOG",
  SERVICE = "SERVICE",
  LANDING = "LANDING",
}

export enum CmsPageStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

@Schema({ _id: false })
export class SeoMetadata {
  @Prop()
  metaTitle: string;

  @Prop()
  metaDescription: string;

  @Prop([String])
  keywords: string[];
}

@Schema({ timestamps: true })
export class CmsPage {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  content: string; // HTML or Markdown

  @Prop({ required: true, enum: CmsPageType, default: CmsPageType.PAGE })
  type: CmsPageType;

  @Prop({ required: true, enum: CmsPageStatus, default: CmsPageStatus.DRAFT })
  status: CmsPageStatus;

  @Prop()
  countryCode?: string;

  @Prop()
  cityId?: string; // Optional: Link to a City ObjectId string if strictly typed, but keeping string for flexibility here

  @Prop({ type: SeoMetadata })
  seo: SeoMetadata;

  @Prop()
  thumbnail?: string; // For blogs/services
}

export const CmsPageSchema = SchemaFactory.createForClass(CmsPage);
