import {
    Controller, Get, Post, Put, Delete, Param, Body, Query, Request, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClinicUsersService } from "./clinic-users.service";

/**
 * Clinic Users Controller
 * Path: /clinics/:clinicId/users
 *
 * All users under a specific clinic are scoped by the clinicId.
 * Core AriesXpert admins can access any clinic's users.
 * Clinic admins can only access their OWN clinic's users.
 */
@Controller("clinics/:clinicId/users")
@UseGuards(AuthGuard("jwt"))
export class ClinicUsersController {
    constructor(private readonly clinicUsersService: ClinicUsersService) { }

    /**
     * GET /clinics/:clinicId/users
     * Returns all users within the specified clinic.
     */
    @Get()
    async findAll(@Param("clinicId") clinicId: string, @Query() query: any, @Request() req: any) {
        this.enforceAccess(req, clinicId);
        const { role, ...filters } = query;
        if (role) filters.role = role;
        return this.clinicUsersService.findByClinic(clinicId, filters);
    }

    /**
     * GET /clinics/:clinicId/users/staff-summary
     * Returns count of staff grouped by role.
     */
    @Get("staff-summary")
    async getStaffSummary(@Param("clinicId") clinicId: string, @Request() req: any) {
        this.enforceAccess(req, clinicId);
        return this.clinicUsersService.getStaffSummary(clinicId);
    }

    /**
     * GET /clinics/:clinicId/users/:userId
     * Returns a specific user in the clinic.
     */
    @Get(":userId")
    async findOne(@Param("clinicId") clinicId: string, @Param("userId") userId: string, @Request() req: any) {
        this.enforceAccess(req, clinicId);
        return this.clinicUsersService.findOne(clinicId, userId);
    }

    /**
     * POST /clinics/:clinicId/users
     * Adds a new user to the clinic.
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Param("clinicId") clinicId: string, @Body() body: any, @Request() req: any) {
        this.enforceAccess(req, clinicId);
        return this.clinicUsersService.create(clinicId, body);
    }

    /**
     * PUT /clinics/:clinicId/users/:userId
     * Updates a user within the clinic.
     */
    @Put(":userId")
    async update(
        @Param("clinicId") clinicId: string,
        @Param("userId") userId: string,
        @Body() body: any,
        @Request() req: any,
    ) {
        this.enforceAccess(req, clinicId);
        return this.clinicUsersService.update(clinicId, userId, body);
    }

    /**
     * DELETE /clinics/:clinicId/users/:userId
     * Soft-deletes a user from the clinic.
     */
    @Delete(":userId")
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @Param("clinicId") clinicId: string,
        @Param("userId") userId: string,
        @Request() req: any,
    ) {
        this.enforceAccess(req, clinicId);
        await this.clinicUsersService.remove(clinicId, userId);
    }

    /**
     * Enforce that a clinic user can only access THEIR clinic.
     * Core Admins can access any clinic.
     */
    private enforceAccess(req: any, clinicId: string) {
        const { role, clinicId: userClinicId } = req.user;
        const coreRoles = ["founder", "super_admin", "admin", "coordinator", "manager", "team_leader", "coo", "cfo", "cmo"];
        if (coreRoles.includes(role)) return; // Core admins can access any clinic

        // Clinic users can only access their own clinic
        if (!userClinicId || String(userClinicId) !== String(clinicId)) {
            throw new Error("Access denied: You can only manage your own clinic's users.");
        }
    }
}
