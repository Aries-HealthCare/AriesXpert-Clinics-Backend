import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpException,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PackagesService } from "./packages.service";
import { CreatePackageDto, UpdatePackageDto } from "./dto/package.dto";
import { AuthGuard } from "@nestjs/passport";

@Controller("packages")
@UseGuards(AuthGuard("jwt"))
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) { }

  @Post()
  async create(@Request() req: any, @Body() createPackageDto: any) {
    try {
      if (req.user.clinicId) {
        createPackageDto.clinicId = req.user.clinicId;
      }
      const result = await this.packagesService.create(createPackageDto);
      return {
        success: true,
        data: result,
        message: "Package created successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to create package",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() updatePackageDto: any) {
    try {
      const result = await this.packagesService.update(id, updatePackageDto);
      return {
        success: true,
        data: result,
        message: "Package updated successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to update package",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    try {
      await this.packagesService.delete(id);
      return {
        success: true,
        message: "Package deleted successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to delete package",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("createPackage")
  async createPackage(@Body() createPackageDto: CreatePackageDto) {
    try {
      const result = await this.packagesService.create(createPackageDto);
      return {
        success: true,
        result,
        message: "Package created successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to create package",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async getAllPackages(@Request() req: any) {
    try {
      const userRole = req.user.role;
      let userClinicId = null;

      if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
        userClinicId = req.user.clinicId;
      }

      const result = await this.packagesService.findAll(userClinicId);
      return {
        success: true,
        data: { packages: result }, // Match dashboard expected format
        message: "Packages fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch packages",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getAllPackages")
  async getAllPackagesLegacy() {
    try {
      const result = await this.packagesService.findAll();
      return {
        success: true,
        result,
        message: "Packages fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch packages",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getPackageById/:id")
  async getPackageById(@Param("id") id: string) {
    try {
      const result = await this.packagesService.findOne(id);
      if (!result) {
        throw new HttpException(
          {
            success: false,
            message: "Package not found",
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        result,
        message: "Package fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch package",
          error: error.message,
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put("updatePackage/:id")
  async updatePackage(
    @Param("id") id: string,
    @Body() updatePackageDto: UpdatePackageDto,
  ) {
    try {
      const result = await this.packagesService.update(id, updatePackageDto);
      return {
        success: true,
        result,
        message: "Package updated successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to update package",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete("deletePackage/:id")
  async deletePackage(@Param("id") id: string) {
    try {
      await this.packagesService.delete(id);
      return {
        success: true,
        message: "Package deleted successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to delete package",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
