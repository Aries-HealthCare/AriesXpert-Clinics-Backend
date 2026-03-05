import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import * as multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { FileManagerController } from "./file-manager.controller";
import { FileManagerService } from "./file-manager.service";
import { FileRecordSchema } from "./file-manager.schema";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "FileRecord", schema: FileRecordSchema },
    ]),
    MulterModule.register({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const entityType = req.body.entityType || "general";
          const entityId = req.body.entityId || "unknown";
          const dest = path.join(uploadDir, entityType, entityId);

          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }

          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Allow all file types for now
        cb(null, true);
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    }),
  ],
  controllers: [FileManagerController],
  providers: [FileManagerService],
  exports: [FileManagerService],
})
export class FileManagerModule {}
