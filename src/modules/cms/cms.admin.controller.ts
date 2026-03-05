import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CmsService } from "./cms.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("cms/admin")
@UseGuards(AuthGuard("jwt"))
export class CmsAdminController {
  constructor(private readonly cmsService: CmsService) {}

  @Get("pages")
  getAllPages(@Query("type") type?: string) {
    return this.cmsService.adminFindAll(type);
  }

  @Post("pages")
  createPage(@Body() body: any) {
    return this.cmsService.create(body);
  }

  @Put("pages/:id")
  updatePage(@Param("id") id: string, @Body() body: any) {
    return this.cmsService.update(id, body);
  }

  @Delete("pages/:id")
  deletePage(@Param("id") id: string) {
    return this.cmsService.delete(id);
  }
}
