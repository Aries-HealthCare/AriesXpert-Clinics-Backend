import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Controller("finance")
export class RazorpayController {
  constructor(private readonly config: ConfigService) {}

  @Post("order")
  async createOrder(@Body() body: any) {
    const {
      amount,
      currency = "INR",
      receipt = `rcpt_${Date.now()}`,
      notes = {},
    } = body;
    const keyId = this.config.get<string>("RAZORPAY_KEY_ID");
    const keySecret = this.config.get<string>("RAZORPAY_KEY_SECRET");

    if (!amount || Number(amount) <= 0)
      throw new BadRequestException("Invalid amount");

    if (keyId && keySecret) {
      const auth = { username: keyId, password: keySecret };
      const payload = {
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt,
        notes,
      };
      const res = await axios.post(
        "https://api.razorpay.com/v1/orders",
        payload,
        { auth },
      );
      return res.data;
    }

    // Fallback mock for development
    return {
      id: `order_${Math.random().toString(36).slice(2)}`,
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt,
      status: "created",
      notes,
    };
  }
}
