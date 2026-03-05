import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from "@nestjs/common";
import { ReferralsService } from "./referrals.service";
import { AuthGuard } from "@nestjs/passport";
import { ReferralType } from "./schemas/referral.schema";

@Controller("referrals")
@UseGuards(AuthGuard("jwt"))
export class ReferralsController {
    constructor(private readonly referralsService: ReferralsService) { }

    @Get("stats")
    async getMyStats(@Request() req: any, @Query("therapistId") therapistId?: string) {
        const id = therapistId || req.user.therapistId || req.user._id;
        return this.referralsService.getTherapistReferralStats(id);
    }

    @Get("history")
    async getMyHistory(@Request() req: any, @Query("therapistId") therapistId?: string) {
        const id = therapistId || req.user.therapistId || req.user._id;
        return this.referralsService.getReferralHistory(id);
    }

    @Post("register")
    async registerNewReferral(@Body() body: { code: string; type: ReferralType; referredId: string }) {
        return this.referralsService.registerReferral(body.code, body.referredId, body.type);
    }

    @Get("stats/:therapistId")
    async getTherapistStats(@Param("therapistId") therapistId: string) {
        return this.referralsService.getTherapistReferralStats(therapistId);
    }

    @Get("history/:therapistId")
    async getTherapistHistory(@Param("therapistId") therapistId: string) {
        return this.referralsService.getReferralHistory(therapistId);
    }
}
