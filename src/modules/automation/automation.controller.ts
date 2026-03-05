import { Body, Controller, Post } from "@nestjs/common";
import { AutomationService } from "./automation.service";

@Controller("automation")
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post("ingest")
  async ingestLead(@Body() body: any) {
    return this.automationService.ingestLead(body);
  }

  @Post("respond")
  async respondToLead(
    @Body()
    body: {
      leadId: string;
      therapistId: string;
      response: "Interested" | "Not Interested";
    },
  ) {
    return this.automationService.handleTherapistResponse(
      body.leadId,
      body.therapistId,
      body.response,
    );
  }
}
