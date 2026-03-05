import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { FileManagerService } from "./file-manager.service";
import * as multer from "multer";

@Controller("files")
@UseGuards(JwtAuthGuard)
export class FileManagerController {
  constructor(private fileManagerService: FileManagerService) {}

  /**
   * Upload file
   */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile() file: multer.File,
    @Body() body: { entityType: string; entityId: string },
    @Request() req,
  ) {
    try {
      const result = await this.fileManagerService.uploadFile(
        file,
        body.entityType,
        body.entityId,
        req.user.id,
      );

      return {
        success: true,
        message: "File uploaded successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get files with filters
   */
  @Get()
  async getFiles(
    @Request() req,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("search") search?: string,
  ) {
    try {
      const result = await this.fileManagerService.getFiles(
        {
          entityType,
          entityId,
          search,
        },
        (page - 1) * limit,
        limit,
      );

      return {
        success: true,
        files: result.files,
        total: result.total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete file
   */
  @Delete(":fileId")
  async deleteFile(@Param("fileId") fileId: string, @Request() req) {
    try {
      await this.fileManagerService.deleteFile(fileId, req.user.id);

      return {
        success: true,
        message: "File deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Create folder
   */
  @Post("folder")
  async createFolder(
    @Body() body: { name: string; entityType: string; entityId: string },
    @Request() req,
  ) {
    try {
      const result = await this.fileManagerService.createFolder(
        body.name,
        body.entityType,
        body.entityId,
        req.user.id,
      );

      return {
        success: true,
        message: "Folder created successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Rename file/folder
   */
  @Put(":fileId/rename")
  async renameFile(
    @Param("fileId") fileId: string,
    @Body() body: { name: string },
    @Request() req,
  ) {
    try {
      const result = await this.fileManagerService.renameFile(
        fileId,
        body.name,
        req.user.id,
      );

      return {
        success: true,
        message: "File renamed successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Move file to folder
   */
  @Put(":fileId/move")
  async moveFile(
    @Param("fileId") fileId: string,
    @Body() body: { targetFolderId?: string },
    @Request() req,
  ) {
    try {
      const result = await this.fileManagerService.moveFile(
        fileId,
        body.targetFolderId,
        req.user.id,
      );

      return {
        success: true,
        message: "File moved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get file statistics
   */
  @Get("statistics")
  async getStatistics(@Request() req) {
    try {
      const stats = await this.fileManagerService.getStatistics(req.user.id);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
