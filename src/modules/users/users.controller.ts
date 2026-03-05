import { Controller, Get, Post, Body, Query, UseGuards, Request } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("users")
@UseGuards(AuthGuard("jwt"))
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async find(@Request() req: any, @Query("role") role?: string, @Query("status") status?: string, @Query("clinicId") clinicId?: string) {
    const userRole = req.user.role;
    let userClinicId = clinicId;

    if (["clinic_owner", "clinic_admin", "receptionist", "therapist"].includes(userRole)) {
      userClinicId = req.user.clinicId;
    }

    const filter: any = {};

    if (userClinicId) {
      filter.clinicId = userClinicId;
    }

    if (role) {
      const roles = role.split(",");
      if (roles.length > 1) {
        filter.role = { $in: roles };
      } else {
        filter.role = role;
      }
    }
    if (status) filter.status = status;

    return this.usersService["userModel"].find(filter).populate("clinicId", "name").lean().exec();
  }

  @Post()
  async create(@Body() body: any) {
    // If the body contains a clinicId, ensure it's saved to the user
    // Provide a default password if not provided
    if (!body.password) {
      body.password = "AriesStaff@123";
    }

    // Fallback names
    if (!body.firstName && body.name) {
      const parts = body.name.split(" ");
      body.firstName = parts[0];
      body.lastName = parts.slice(1).join(" ") || "Staff";
    }

    // Generate a phone if missing
    if (!body.phone) {
      body.phone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    return this.usersService.create(body);
  }
}
