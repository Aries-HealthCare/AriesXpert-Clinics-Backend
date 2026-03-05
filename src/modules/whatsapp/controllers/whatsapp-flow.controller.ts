/**
 * WhatsApp Flow Controller
 * CRUD operations for visual bot flows
 */

import {
    Controller, Get, Post, Put, Delete, Body, Param, Logger, Query
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { WhatsAppFlow, WhatsAppFlowDocument } from "../schemas/whatsapp-flow.schema";

@Controller("whatsapp/flows")
export class WhatsAppFlowController {
    private readonly logger = new Logger(WhatsAppFlowController.name);

    constructor(
        @InjectModel(WhatsAppFlow.name)
        private flowModel: Model<WhatsAppFlowDocument>,
    ) { }

    /**
     * GET /whatsapp/flows — List all flows
     */
    @Get()
    async listFlows(@Query("status") status?: string) {
        try {
            const filter: any = {};
            if (status) filter.status = status;
            const flows = await this.flowModel
                .find(filter)
                .sort({ updatedAt: -1 })
                .exec();
            return flows;
        } catch (error) {
            this.logger.error(`Failed to list flows: ${error.message}`);
            return [];
        }
    }

    /**
     * GET /whatsapp/flows/:id — Get a single flow
     */
    @Get(":id")
    async getFlow(@Param("id") id: string) {
        const flow = await this.flowModel.findById(id).exec();
        if (!flow) {
            return { success: false, message: "Flow not found" };
        }
        return flow;
    }

    /**
     * POST /whatsapp/flows — Create a new flow
     */
    @Post()
    async createFlow(@Body() body: any) {
        try {
            // Extract trigger keywords from trigger nodes
            const triggerKeywords = this.extractTriggerKeywords(body.nodes || []);
            const triggerType = this.extractTriggerType(body.nodes || []);

            const flow = await this.flowModel.create({
                name: body.name || "Untitled Flow",
                status: body.status || "draft",
                nodes: body.nodes || [],
                edges: body.edges || [],
                triggerKeywords,
                triggerType,
            });

            this.logger.log(`Flow created: ${flow.name} (${flow._id})`);
            return { success: true, flow };
        } catch (error) {
            this.logger.error(`Failed to create flow: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * PUT /whatsapp/flows/:id — Update a flow
     */
    @Put(":id")
    async updateFlow(@Param("id") id: string, @Body() body: any) {
        try {
            const update: any = {};
            if (body.name !== undefined) update.name = body.name;
            if (body.status !== undefined) update.status = body.status;
            if (body.nodes !== undefined) {
                update.nodes = body.nodes;
                update.triggerKeywords = this.extractTriggerKeywords(body.nodes);
                update.triggerType = this.extractTriggerType(body.nodes);
            }
            if (body.edges !== undefined) update.edges = body.edges;

            const flow = await this.flowModel.findByIdAndUpdate(
                id,
                { $set: update, $inc: { version: 1 } },
                { new: true }
            ).exec();

            if (!flow) {
                return { success: false, message: "Flow not found" };
            }

            this.logger.log(`Flow updated: ${flow.name} (v${flow.version})`);
            return { success: true, flow };
        } catch (error) {
            this.logger.error(`Failed to update flow: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * DELETE /whatsapp/flows/:id — Delete a flow
     */
    @Delete(":id")
    async deleteFlow(@Param("id") id: string) {
        try {
            await this.flowModel.findByIdAndDelete(id).exec();
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to delete flow: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * POST /whatsapp/flows/:id/duplicate — Duplicate a flow
     */
    @Post(":id/duplicate")
    async duplicateFlow(@Param("id") id: string) {
        const original = await this.flowModel.findById(id).exec();
        if (!original) {
            return { success: false, message: "Flow not found" };
        }

        const copy = await this.flowModel.create({
            name: `${original.name} (Copy)`,
            status: "draft",
            nodes: original.nodes,
            edges: original.edges,
            triggerKeywords: original.triggerKeywords,
            triggerType: original.triggerType,
        });

        return { success: true, flow: copy };
    }

    // ─── Helpers ───────────────────────────────────────

    private extractTriggerKeywords(nodes: any[]): string[] {
        const keywords: string[] = [];
        for (const node of nodes) {
            if (node.type === "trigger" && node.data?.triggerType === "keyword" && node.data?.keyword) {
                const kws = node.data.keyword.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean);
                keywords.push(...kws);
            }
        }
        return keywords;
    }

    private extractTriggerType(nodes: any[]): string {
        const triggerNode = nodes.find((n: any) => n.type === "trigger");
        return triggerNode?.data?.triggerType || "keyword";
    }
}
