import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    BadRequestException,
} from "@nestjs/common";
import { FlashAlertsService } from "./flash-alerts.service";
import { JwtAuthGuard } from "../../common/guards";

@Controller("flash-alerts")
@UseGuards(JwtAuthGuard)
export class FlashAlertsController {
    constructor(private readonly flashAlertsService: FlashAlertsService) {
        console.log('[FlashAlertsController] Initialized and listening for routes.');
    }


    @Post()
    async createFlashAlert(@Body() dto: any, @Request() req: any) {
        try {
            const creatorId = req.user.id || req.user.userId || req.user._id;
            const flashAlert = await this.flashAlertsService.createAndSend(dto, creatorId);
            return { success: true, data: flashAlert };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }


    @Get()
    async getFlashAlerts() {
        try {
            const alerts = await this.flashAlertsService.findAll();
            return { success: true, data: alerts };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    @Get(":id")
    async getFlashAlert(@Param("id") id: string) {
        try {
            const result = await this.flashAlertsService.findOne(id);
            return { success: true, ...result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    @Post(":id/reply")
    async replyFlashAlert(
        @Param("id") id: string,
        @Body() dto: { value: string },
        @Request() req: any
    ) {
        try {
            const userId = req.user.id || req.user.userId || req.user._id;
            const reply = await this.flashAlertsService.saveReply(id, userId, dto.value);
            return { success: true, data: reply };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }


    @Get(":id/stats")
    async getFlashAlertStats(@Param("id") id: string) {
        try {
            const stats = await this.flashAlertsService.getStats(id);
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}
