import { Controller, Get, Patch, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getMyNotifications(@Request() req: any) {
        const userId = req.user._id?.toString() || req.user.id?.toString();
        return {
            success: true,
            data: await this.notificationsService.getForUser(userId),
        };
    }

    @Patch('mark-all-read')
    async markAllRead(@Request() req: any) {
        const userId = req.user._id?.toString() || req.user.id?.toString();
        await this.notificationsService.markAllRead(userId);
        return { success: true, message: 'All notifications marked as read' };
    }

    @Patch(':id/read')
    async markRead(@Param('id') id: string, @Request() req: any) {
        const userId = req.user._id?.toString() || req.user.id?.toString();
        await this.notificationsService.markRead(id, userId);
        return { success: true };
    }

    @Delete('all')
    async deleteAll(@Request() req: any) {
        const userId = req.user._id?.toString() || req.user.id?.toString();
        await this.notificationsService.deleteAll(userId);
        return { success: true, message: 'All notifications cleared' };
    }
}
