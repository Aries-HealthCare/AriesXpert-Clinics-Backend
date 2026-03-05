import { Injectable, Logger, ConflictException, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Referral, ReferralDocument, ReferralType, ReferralStatus } from "./schemas/referral.schema";
import { ReferralEarning, ReferralEarningDocument, EarningStatus } from "./schemas/referral-earning.schema";
import { WalletService } from "../finance/wallet.service";

@Injectable()
export class ReferralsService {
    private readonly logger = new Logger(ReferralsService.name);

    constructor(
        @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
        @InjectModel(ReferralEarning.name) private earningModel: Model<ReferralEarningDocument>,
        @InjectModel("Therapist") private therapistModel: Model<any>,
        @InjectModel("Patient") private patientModel: Model<any>,
        @Inject(forwardRef(() => WalletService))
        private walletService: WalletService,
    ) { }

    /**
     * Generates a unique referral code for a therapist if they don't have one.
     */
    async getOrCreateReferralCode(therapistId: string): Promise<string> {
        const therapist = await this.therapistModel.findById(therapistId);
        if (!therapist) throw new NotFoundException("Therapist not found");

        if (therapist.referralCode) return therapist.referralCode;

        // Generate code: AX-[CITY]-[6-RANDOM-ALPHANUM]
        const cityAbbr = (therapist.city || "AX").substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `AX-${cityAbbr}-${random}`;

        therapist.referralCode = code;
        await therapist.save();
        return code;
    }

    /**
     * Registers a new referral link when a patient or expert uses a code.
     */
    async registerReferral(referrerCode: string, referredId: string, type: ReferralType): Promise<Referral> {
        const referrer = await this.therapistModel.findOne({ referralCode: referrerCode.toUpperCase() });
        if (!referrer) throw new NotFoundException("Invalid referral code");

        // Prevent self-referral
        if (referrer._id.toString() === referredId.toString()) {
            throw new ConflictException("Self-referral is not allowed");
        }

        // Check if duplicate referral exists
        const existing = await this.referralModel.findOne({
            referredUserId: new Types.ObjectId(referredId),
            referralType: type
        });
        if (existing) {
            return existing; // Already referred
        }

        const referral = new this.referralModel({
            referrerTherapistId: referrer._id,
            referredUserId: new Types.ObjectId(referredId),
            referralType: type,
            referralCodeUsed: referrerCode.toUpperCase(),
            referralStatus: ReferralStatus.ACTIVE,
        });

        // If patient, update patient record
        if (type === ReferralType.PATIENT) {
            await this.patientModel.findByIdAndUpdate(referredId, {
                referredBy: referrer._id,
                isReferred: true
            });
        }

        return referral.save();
    }

    /**
   * Process bonus for a completed visit.
   * Bonus = 10% of visit professional fee
   */
    async processVisitBonus(visitId: string, patientId: string, professionalFee: number): Promise<void> {
        const referral = await this.referralModel.findOne({
            referredUserId: new Types.ObjectId(patientId),
            referralType: ReferralType.PATIENT,
            referralStatus: ReferralStatus.ACTIVE
        });

        if (!referral) return; // Not a referred patient

        const bonusAmount = Math.round(professionalFee * 0.10 * 100);

        await this.creditEarning(
            referral._id,
            referral.referrerTherapistId,
            bonusAmount,
            10,
            "VISIT",
            visitId
        );

        this.logger.log(`Processed visit bonus: ₹${bonusAmount} for referrer ${referral.referrerTherapistId} from visit ${visitId}`);
    }

    /**
     * Process bonus for expert registration.
     * Bonus = 10% of registration charge
     */
    async processExpertRegistrationBonus(expertUserId: string, paymentId: string, amount: number): Promise<void> {
        const referral = await this.referralModel.findOne({
            referredUserId: new Types.ObjectId(expertUserId),
            referralType: ReferralType.EXPERT,
            referralStatus: ReferralStatus.ACTIVE
        });

        if (!referral) return; // Not a referred expert

        const bonusAmount = Math.round(amount * 0.10 * 100);

        await this.creditEarning(
            referral._id,
            referral.referrerTherapistId,
            bonusAmount,
            10,
            "REGISTRATION",
            paymentId
        );

        this.logger.log(`Processed expert registration bonus: ₹${bonusAmount} for referrer ${referral.referrerTherapistId}`);
    }

    /**
     * Generic earning credit logic
     */
    async creditEarning(
        referralId: Types.ObjectId,
        referrerId: Types.ObjectId,
        amount: number,
        percentage: number,
        type: "VISIT" | "REGISTRATION",
        refId: string
    ): Promise<void> {
        const therapist = await this.therapistModel.findById(referrerId);
        if (!therapist) return;

        const description = type === "VISIT" ? `Referral bonus for visit ${refId}` : `Expert referral bonus for registration ${refId}`;
        const earning = new this.earningModel({
            referralId,
            referrerTherapistId: referrerId,
            earningAmount: amount,
            percentageApplied: percentage,
            earningStatus: EarningStatus.CREDITED,
            visitId: type === "VISIT" ? refId : undefined,
            registrationPaymentId: type === "REGISTRATION" ? refId : undefined,
            description,
        });

        await earning.save();

        // Update Wallet via main Finance system
        const userId = typeof therapist.userId === "object" ? (therapist.userId._id?.toString() || therapist.userId.toString()) : (therapist.userId?.toString() || therapist.userId);
        if (userId) {
            await this.walletService.recordReferralBonus(userId, amount, refId || earning._id.toString(), description);
        }
    }

    async getTherapistReferralStatsByCode(code: string) {
        const therapist = await this.therapistModel.findOne({ referralCode: code.toUpperCase() });
        if (!therapist) return { therapistId: null };
        return {
            therapistId: therapist._id,
            name: therapist.name,
        };
    }


    async getTherapistReferralStats(therapistId: string) {
        const therapistOid = new Types.ObjectId(therapistId);

        const [totalReferrals, activeReferrals, pendingReferrals, earnings] = await Promise.all([
            this.referralModel.countDocuments({ referrerTherapistId: therapistOid }),
            this.referralModel.countDocuments({ referrerTherapistId: therapistOid, referralStatus: ReferralStatus.ACTIVE }),
            this.referralModel.countDocuments({ referrerTherapistId: therapistOid, referralStatus: ReferralStatus.PENDING }),
            this.earningModel.aggregate([
                { $match: { referrerTherapistId: therapistOid, earningStatus: EarningStatus.CREDITED } },
                { $group: { _id: null, total: { $sum: "$earningAmount" } } }
            ])
        ]);

        const therapist = await this.therapistModel.findById(therapistId);

        return {
            referralCode: therapist?.referralCode || await this.getOrCreateReferralCode(therapistId),
            totalReferrals,
            activeReferrals,
            pendingReferrals,
            totalEarnings: earnings[0]?.total || 0,
        };
    }

    async getReferralHistory(therapistId: string) {
        const therapistOid = new Types.ObjectId(therapistId);
        const referrals = await this.referralModel.find({ referrerTherapistId: therapistOid }).sort({ createdAt: -1 }).lean();

        // For each referral, get total earnings and count
        const history = await Promise.all(referrals.map(async (ref) => {
            const earnings = await this.earningModel.find({ referralId: ref._id }).lean();
            const totalEarned = earnings.reduce((sum, e) => sum + e.earningAmount, 0);

            let referredUser = { name: "Unknown", phone: "" };
            if (ref.referralType === ReferralType.PATIENT) {
                const p = await this.patientModel.findById(ref.referredUserId);
                if (p) {
                    referredUser = {
                        name: `${p.firstName} ${p.lastName || ""}`.trim(),
                        phone: p.phone || ""
                    };
                }
            } else {
                const t = await this.therapistModel.findOne({ userId: ref.referredUserId });
                if (t) {
                    referredUser = {
                        name: t.name,
                        phone: t.phoneNumber || ""
                    };
                }
            }

            return {
                ...ref,
                referredUser,
                totalEarnings: totalEarned,
                visitCount: earnings.filter(e => !!e.visitId).length,
                registrationBonus: earnings.find(e => !!e.registrationPaymentId)?.earningAmount || 0,
            };
        }));

        return history;
    }
}
