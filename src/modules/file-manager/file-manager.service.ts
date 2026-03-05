import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as path from "path";
import * as fs from "fs";

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

@Injectable()
export class FileManagerService {
  private uploadDir = process.env.UPLOAD_DIR || "./uploads";

  constructor(@InjectModel("FileRecord") private fileModel: Model<any>) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: UploadedFile,
    entityType: string,
    entityId: string,
    userId: string,
  ) {
    try {
      const entityFolder = path.join(this.uploadDir, entityType, entityId);

      if (!fs.existsSync(entityFolder)) {
        fs.mkdirSync(entityFolder, { recursive: true });
      }

      const fileRecord = await this.fileModel.create({
        name: file.originalname,
        type: "file",
        entityType,
        entityId,
        fileSize: file.size,
        fileType: path.extname(file.originalname),
        url: `/uploads/${entityType}/${entityId}/${file.filename}`,
        uploadedBy: userId,
        uploadedAt: new Date(),
      });

      return {
        fileId: fileRecord._id,
        fileName: fileRecord.name,
        fileSize: fileRecord.fileSize,
        url: fileRecord.url,
        uploadedAt: fileRecord.uploadedAt,
      };
    } catch (error) {
      throw new BadRequestException("Failed to upload file: " + error.message);
    }
  }

  async getFiles(
    filters: {
      entityType?: string;
      entityId?: string;
      search?: string;
    },
    skip: number = 0,
    limit: number = 20,
  ) {
    try {
      const query: any = {};

      if (filters.entityType) {
        query.entityType = filters.entityType;
      }
      if (filters.entityId) {
        query.entityId = filters.entityId;
      }
      if (filters.search) {
        query.name = { $regex: filters.search, $options: "i" };
      }

      const files = await this.fileModel
        .find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await this.fileModel.countDocuments(query);

      return { files, total };
    } catch (error) {
      throw new BadRequestException("Failed to fetch files: " + error.message);
    }
  }

  async deleteFile(fileId: string, userId: string) {
    try {
      const file = await this.fileModel.findById(fileId);

      if (!file) {
        throw new NotFoundException("File not found");
      }

      // Delete from filesystem if needed
      if (file.url && file.url.startsWith("/uploads/")) {
        const filePath = path.join(
          this.uploadDir,
          file.url.replace("/uploads/", ""),
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await this.fileModel.findByIdAndDelete(fileId);

      return { success: true };
    } catch (error) {
      throw new BadRequestException("Failed to delete file: " + error.message);
    }
  }

  async createFolder(
    name: string,
    entityType: string,
    entityId: string,
    userId: string,
  ) {
    try {
      const folderPath = path.join(this.uploadDir, entityType, entityId, name);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const folder = await this.fileModel.create({
        name,
        type: "folder",
        entityType,
        entityId,
        uploadedBy: userId,
        uploadedAt: new Date(),
      });

      return folder;
    } catch (error) {
      throw new BadRequestException(
        "Failed to create folder: " + error.message,
      );
    }
  }

  async renameFile(fileId: string, newName: string, userId: string) {
    try {
      const file = await this.fileModel.findByIdAndUpdate(
        fileId,
        { name: newName },
        { new: true },
      );

      if (!file) {
        throw new NotFoundException("File not found");
      }

      return file;
    } catch (error) {
      throw new BadRequestException("Failed to rename file: " + error.message);
    }
  }

  async moveFile(fileId: string, targetFolderId?: string, userId?: string) {
    try {
      const file = await this.fileModel.findByIdAndUpdate(
        fileId,
        { parentFolderId: targetFolderId },
        { new: true },
      );

      if (!file) {
        throw new NotFoundException("File not found");
      }

      return file;
    } catch (error) {
      throw new BadRequestException("Failed to move file: " + error.message);
    }
  }

  async getStatistics(userId: string) {
    try {
      const files = await this.fileModel.find({});

      let totalSize = 0;
      const filesByType: { [key: string]: number } = {};

      files.forEach((file) => {
        if (file.fileSize) {
          totalSize += file.fileSize;
        }
        const ext = file.fileType || "unknown";
        filesByType[ext] = (filesByType[ext] || 0) + 1;
      });

      const maxStorage = 10 * 1024 * 1024 * 1024; // 10GB
      const storageUsage = (totalSize / maxStorage) * 100;

      return {
        totalFiles: files.length,
        totalSize,
        filesByType,
        storageUsage: Math.round(storageUsage * 100) / 100,
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch statistics: " + error.message,
      );
    }
  }
}
