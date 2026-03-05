/**
 * WhatsApp Contact Controller
 * File: src/modules/whatsapp/controllers/whatsapp-contact.controller.ts
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import {
    WhatsAppContact,
    WhatsAppContactDocument,
} from "../schemas/whatsapp-contact.schema";

@Controller("whatsapp/contacts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppContactController {
    private readonly logger = new Logger(WhatsAppContactController.name);

    constructor(
        @InjectModel(WhatsAppContact.name)
        private contactModel: Model<WhatsAppContactDocument>,
    ) { }

    @Get()
    @Roles("super_admin", "founder", "clinic_owner", "doctor")
    async list(@Query("search") search?: string, @Query("tag") tag?: string) {
        try {
            const filter: any = {};
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { phoneNumber: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ];
            }
            if (tag) {
                filter.tags = tag;
            }

            const contacts = await this.contactModel
                .find(filter)
                .sort({ lastInteractionAt: -1, createdAt: -1 })
                .limit(200);

            return contacts;
        } catch (error) {
            this.logger.error(`Failed to fetch contacts: ${error.message}`);
            return [];
        }
    }

    @Get(":id")
    @Roles("super_admin", "founder", "clinic_owner")
    async getOne(@Param("id") id: string) {
        return this.contactModel.findById(id);
    }

    @Post()
    @Roles("super_admin", "founder", "clinic_owner")
    async create(@Body() data: any) {
        // Basic deduplication
        const existing = await this.contactModel.findOne({
            phoneNumber: data.phoneNumber,
        });
        if (existing) {
            return this.contactModel.findByIdAndUpdate(existing._id, data, {
                new: true,
            });
        }

        const contact = new this.contactModel(data);
        return contact.save();
    }

    @Put(":id")
    @Roles("super_admin", "founder", "clinic_owner")
    async update(@Param("id") id: string, @Body() data: any) {
        return this.contactModel.findByIdAndUpdate(id, data, { new: true });
    }

    @Delete(":id")
    @Roles("super_admin", "founder")
    async delete(@Param("id") id: string) {
        await this.contactModel.findByIdAndDelete(id);
        return { success: true };
    }

    @Post("bulk-tag")
    @Roles("super_admin", "founder", "clinic_owner")
    async bulkTag(@Body() body: { ids: string[]; tag: string }) {
        await this.contactModel.updateMany(
            { _id: { $in: body.ids } },
            { $addToSet: { tags: body.tag } },
        );
        return { success: true };
    }

    @Post("bulk-delete")
    @Roles("super_admin", "founder")
    async bulkDelete(@Body() body: { ids: string[] }) {
        await this.contactModel.deleteMany({ _id: { $in: body.ids } });
        return { success: true };
    }
}
