import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RegisteredClinic, RegisteredClinicDocument } from "./schemas/registered-clinic.schema";

@Injectable()
export class RegistryService {
    private readonly logger = new Logger(RegistryService.name);

    constructor(
        @InjectModel(RegisteredClinic.name, 'registry')
        private registryModel: Model<RegisteredClinicDocument>
    ) { }

    async registerClinic(data: Partial<RegisteredClinic>) {
        this.logger.log(`Registering new clinic in registry: ${data.clinicName} -> ${data.databaseName}`);
        return this.registryModel.create(data);
    }

    async getClinicRegistry(clinicId: string) {
        return this.registryModel.findOne({ clinicId }).exec();
    }

    async findByDatabaseName(databaseName: string) {
        return this.registryModel.findOne({ databaseName }).exec();
    }

    async updateStatus(clinicId: string, status: string) {
        return this.registryModel.findOneAndUpdate({ clinicId }, { status }, { new: true }).exec();
    }
}
