import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { RoyaltiesService } from "./royalties.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("royalties")
@UseGuards(AuthGuard("jwt"))
export class RoyaltiesController {
  constructor(private readonly royaltiesService: RoyaltiesService) {}

  @Post("calculate")
  calculate(@Body() body: { month: string }) {
    return this.royaltiesService.calculateMonthlyRoyalty(body.month);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.royaltiesService.findAll(query);
  }

  @Put(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() body: { status: string; transactionId?: string },
  ) {
    return this.royaltiesService.updateStatus(
      id,
      body.status,
      body.transactionId,
    );
  }
}
