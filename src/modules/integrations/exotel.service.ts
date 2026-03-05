import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class ExotelService {
  private readonly logger = new Logger(ExotelService.name);
  constructor(private readonly config: ConfigService) {}

  async connectCall(toPhone: string, fromPhone?: string) {
    const sid = this.config.get<string>("EXOTEL_SID");
    const token = this.config.get<string>("EXOTEL_TOKEN");
    const callerId = this.config.get<string>("EXOTEL_VIRTUAL_NUMBER");
    const from = fromPhone || callerId;
    if (sid && token && from) {
      const url = `https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`;
      const form = new URLSearchParams({
        From: String(from),
        To: String(toPhone),
        CallerId: String(callerId),
        TimeLimit: "600",
        TimeOut: "30",
        CallType: "trans",
      });
      const res = await axios.post(url, form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: { username: sid, password: token },
      });
      return res.data;
    }
    this.logger.warn("Exotel credentials missing; returning mock result");
    return { success: true, mock: true };
  }
}
