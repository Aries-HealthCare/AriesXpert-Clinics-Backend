import { Controller, Get } from "@nestjs/common";

@Controller("")
export class ApiRootController {
  @Get()
  root() {
    return {
      base: "/api/v1",
      version: "/api/v1/version",
      users: "/api/v1/users?role=therapist",
      patients: "/api/v1/patients",
      leads: "/api/v1/leads",
      sos: "/api/v1/sos",
      dashboardStats: "/api/v1/dashboard/stats",
    };
  }
}
