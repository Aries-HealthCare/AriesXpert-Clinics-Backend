import { Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class FileRecord {
  name: string;
  type: "file" | "folder"; // file or folder
  entityType: string; // therapist, patient, clinic, etc.
  entityId: string; // ID of the entity
  fileSize?: number; // Size in bytes
  fileType?: string; // Extension or MIME type
  url?: string; // Public URL or local path
  uploadedBy: string; // User ID
  uploadedAt: Date;
  parentFolderId?: string; // For nested folder structure
  description?: string;
  tags?: string[];
}

export const FileRecordSchema = SchemaFactory.createForClass(FileRecord);

// Create indexes for efficient querying
FileRecordSchema.index({ entityType: 1, entityId: 1 });
FileRecordSchema.index({ uploadedBy: 1 });
FileRecordSchema.index({ uploadedAt: -1 });
FileRecordSchema.index({ name: "text" }); // Text search index
