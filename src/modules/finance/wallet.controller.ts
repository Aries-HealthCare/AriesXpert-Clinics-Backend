import {
    Controller, Get, Post, Body, UseGuards, Request, Logger, Query
} from '@nestjs/common';
import { WalletService } from '../finance/wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * WalletController
 * Provides /wallet/* endpoints expected by the AriesXpertV2 mobile app.
 * The mobile calls:
 *   GET  /wallet/my-wallet         → current user's wallet + recent ledger
 *   POST /wallet/payout/request    → request a withdrawal
 */
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
    private readonly logger = new Logger(WalletController.name);

    constructor(private readonly walletService: WalletService) { }

    /**
     * GET /wallet/my-wallet
     * Returns wallet balance + recent transactions for the authenticated therapist.
     */
    @Get('my-wallet')
    async getMyWallet(@Request() req: any) {
        try {
            const userId = req.user.id;
            const [wallet, ledger] = await Promise.all([
                this.walletService.getWallet(userId),
                this.walletService.getLedger({ userId, limit: 20, page: 1 }),
            ]);
            return {
                success: true,
                data: {
                    wallet: {
                        availableBalance: wallet?.lockedBalance ?? 0,
                        pendingBalance: wallet?.pendingBalance ?? 0,
                        liabilityBalance: wallet?.liabilityBalance ?? 0,
                        currency: 'INR',
                    },
                    recentTransactions: ledger.data,
                },
            };
        } catch (error) {
            this.logger.error(`getMyWallet error: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * POST /wallet/payout/request
     * Therapist requests a payout withdrawal.
     */
    @Post('payout/request')
    async requestPayout(@Request() req: any, @Body() body: { amount: number; bankDetails?: any }) {
        try {
            const userId = req.user.id;
            const result = await this.walletService.requestWithdrawal(userId, body.amount);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * GET /wallet/summary
     * Financial summary (earnings) for a period.
     */
    @Get('summary')
    async getSummary(@Request() req: any, @Query('period') period: string = 'month') {
        try {
            const userId = req.user.id;
            const data = await this.walletService.getFinancialSummary(userId, period);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}
