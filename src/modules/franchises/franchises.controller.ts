import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { FranchisesService } from "./franchises.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("franchises")
@UseGuards(AuthGuard("jwt"))
export class FranchisesController {
  constructor(private readonly franchisesService: FranchisesService) {}

  @Post()
  create(@Body() body: any) {
    return this.franchisesService.create(body);
  }

  @Get()
  async findAll() {
    const franchises = await this.franchisesService.findAll();
    return { franchises };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.franchisesService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.franchisesService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.franchisesService.remove(id);
  }
}
