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
import { RolesService } from "./roles.service";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";

@Controller("role")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post("createRole")
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    try {
      const result = await this.rolesService.create(createRoleDto);
      return {
        success: true,
        result,
        message: "Role created successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to create role",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getAllRoles")
  async getAllRoles() {
    try {
      const result = await this.rolesService.findAll();
      return {
        success: true,
        result,
        message: "Roles fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch roles",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("getRoleById/:id")
  async getRoleById(@Param("id") id: string) {
    try {
      const result = await this.rolesService.findOne(id);
      if (!result) {
        throw new HttpException(
          {
            success: false,
            message: "Role not found",
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        result,
        message: "Role fetched successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to fetch role",
          error: error.message,
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put("updateRole/:id")
  async updateRole(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    try {
      const result = await this.rolesService.update(id, updateRoleDto);
      return {
        success: true,
        result,
        message: "Role updated successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to update role",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete("deleteRole/:id")
  async deleteRole(@Param("id") id: string) {
    try {
      await this.rolesService.delete(id);
      return {
        success: true,
        message: "Role deleted successfully",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to delete role",
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
