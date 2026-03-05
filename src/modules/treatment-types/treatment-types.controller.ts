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
} from "@nestjs/common";
import { TreatmentTypesService } from "./treatment-types.service";
import {
  CreateTreatmentTypeDto,
  UpdateTreatmentTypeDto,
} from "./dto/treatment-type.dto";

@Controller("treatmentType")
export class TreatmentTypesController {
  constructor(private readonly treatmentTypesService: TreatmentTypesService) {}

  @Post("createTreatmentType")
  async createTreatmentType(@Body() createDto: CreateTreatmentTypeDto) {
    try {
      const result = await this.treatmentTypesService.create(createDto);
      return {
        success: true,
        result,
        message: "Treatment type created successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to create treatment type",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getAllTreatmentTypes")
  async getAllTreatmentTypes() {
    try {
      const result = await this.treatmentTypesService.findAll();
      return {
        success: true,
        result,
        message: "Treatment types fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch treatment types",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getAllTreatmentTypesForManagement")
  async getAllTreatmentTypesForManagement() {
    try {
      const result = await this.treatmentTypesService.findAllForManagement();
      return {
        success: true,
        result,
        message: "Treatment types fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch treatment types",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getTreatmentTypeById/:id")
  async getTreatmentTypeById(@Param("id") id: string) {
    try {
      const result = await this.treatmentTypesService.findOne(id);
      if (!result) {
        throw new HttpException(
          {
            success: false,
            message: "Treatment type not found",
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        result,
        message: "Treatment type fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch treatment type",
          error: error.message,
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put("updateTreatmentType/:id")
  async updateTreatmentType(
    @Param("id") id: string,
    @Body() updateDto: UpdateTreatmentTypeDto,
  ) {
    try {
      const result = await this.treatmentTypesService.update(id, updateDto);
      return {
        success: true,
        result,
        message: "Treatment type updated successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to update treatment type",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete("deleteTreatmentType/:id")
  async deleteTreatmentType(@Param("id") id: string) {
    try {
      await this.treatmentTypesService.delete(id);
      return {
        success: true,
        message: "Treatment type deleted successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to delete treatment type",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
