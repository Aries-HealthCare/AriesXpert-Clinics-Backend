import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ClinicUser, ClinicUserDocument, ClinicUserSchema } from "./schemas/clinic-user.schema";
import { TenantConnectionService } from "../../common/multitenancy/tenant-connection.service";

@Injectable()
export class ClinicUsersService {
    private readonly logger = new Logger(ClinicUsersService.name);

    constructor(
        @InjectModel(ClinicUser.name) private mainClinicUserModel: Model<ClinicUserDocument>,
        private readonly tenantConnectionService: TenantConnectionService,
    ) { }

    private async getModel(): Promise<Model<ClinicUserDocument>> {
        // Dynamically get the model for the current tenant's database
        // This ensures data isolation between clinics
        return this.tenantConnectionService.getTenantModel(ClinicUser.name, ClinicUserSchema);
    }

    /**
     * Create a user scoped to a specific clinic.
     */
    async create(clinicId: string, data: Partial<ClinicUser>): Promise<ClinicUser> {
        const model = await this.getModel();
        const user = new model({
            ...data,
            clinicId: new Types.ObjectId(clinicId),
        });
        return user.save();
    }

    /**
     * Get ALL users belonging to a specific clinic.
     */
    async findByClinic(clinicId: string, filters: any = {}): Promise<ClinicUser[]> {
        const model = await this.getModel();
        return model.find({
            clinicId: new Types.ObjectId(clinicId),
            isDeleted: { $ne: true },
            ...filters,
        }).lean().exec();
    }

    /**
     * Get a specific user by ID within a clinic (ensures data isolation).
     */
    async findOne(clinicId: string, userId: string): Promise<ClinicUser> {
        const model = await this.getModel();
        const user = await model.findOne({
            _id: new Types.ObjectId(userId),
            clinicId: new Types.ObjectId(clinicId),
            isDeleted: { $ne: true },
        }).lean().exec();

        if (!user) throw new NotFoundException(`User not found in this clinic`);
        return user;
    }

    /**
     * Get a single clinic user by email (for auth lookups).
     */
    async findByEmail(email: string): Promise<ClinicUserDocument | null> {
        const model = await this.getModel();
        return model
            .findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } })
            .select("+password")
            .exec();
    }

    /**
     * Get a single clinic user by phone.
     */
    async findByPhone(phone: string): Promise<ClinicUserDocument | null> {
        const model = await this.getModel();
        return model
            .findOne({ phone, isDeleted: { $ne: true } })
            .exec();
    }

    /**
     * Update a user within a clinic.
     */
    async update(clinicId: string, userId: string, data: Partial<ClinicUser>): Promise<ClinicUser> {
        const model = await this.getModel();
        const user = await model.findOneAndUpdate(
            { _id: new Types.ObjectId(userId), clinicId: new Types.ObjectId(clinicId) },
            { $set: data },
            { new: true }
        ).lean().exec();

        if (!user) throw new NotFoundException(`User not found in this clinic`);
        return user;
    }

    /**
     * Soft delete a user from a clinic.
     */
    async remove(clinicId: string, userId: string): Promise<void> {
        const model = await this.getModel();
        await model.findOneAndUpdate(
            { _id: new Types.ObjectId(userId), clinicId: new Types.ObjectId(clinicId) },
            { $set: { isDeleted: true, isActive: false } }
        ).exec();
    }

    /**
     * Bulk update all users belonging to a clinic (e.g., on approval/suspension).
     */
    async updateManyByClinic(clinicId: string, data: Partial<ClinicUser>): Promise<void> {
        const model = await this.getModel();
        await model.updateMany(
            { clinicId: new Types.ObjectId(clinicId), isDeleted: { $ne: true } },
            { $set: data }
        ).exec();
    }

    /**
     * Get staff summary grouped by role for a clinic.
     */
    async getStaffSummary(clinicId: string): Promise<any[]> {
        const model = await this.getModel();
        return model.aggregate([
            { $match: { clinicId: new Types.ObjectId(clinicId), isDeleted: { $ne: true } } },
            { $group: { _id: "$role", count: { $sum: 1 } } },
            { $project: { role: "$_id", count: 1, _id: 0 } },
        ]).exec();
    }

    /**
     * Check if email is already taken within ANY clinic (prevent duplicates).
     */
    async isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
        const model = await this.getModel();
        const query: any = { email: email.toLowerCase().trim() };
        if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
        const count = await model.countDocuments(query);
        return count > 0;
    }
}
