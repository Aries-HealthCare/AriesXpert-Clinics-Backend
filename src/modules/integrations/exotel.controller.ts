import { Controller, Post, Body } from "@nestjs/common";
import { ExotelService } from "./exotel.service";

@Controller("integrations/exotel")
export class ExotelController {
  constructor(private readonly exotel: ExotelService) {}

  @Post("call")
  async call(@Body() body: any) {
    const { to, from } = body;
    return this.exotel.connectCall(String(to), from ? String(from) : undefined);
  }
}
