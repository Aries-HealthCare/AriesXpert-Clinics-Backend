import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { BroadcastsService } from "./broadcasts.service"; // Renamed inside service but not path
import { AuthGuard } from "@nestjs/passport";

@Controller("announcements")
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) { }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  create(@Body() createBroadcastDto: any, @Req() req: any) {
    return this.broadcastsService.create(createBroadcastDto, req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get()
  findAll(@Query() query: any) {
    return this.broadcastsService.findAll(query);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.broadcastsService.findOne(id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put(":id")
  update(@Param("id") id: string, @Body() updateBroadcastDto: any) {
    return this.broadcastsService.update(id, updateBroadcastDto);
  }
}
