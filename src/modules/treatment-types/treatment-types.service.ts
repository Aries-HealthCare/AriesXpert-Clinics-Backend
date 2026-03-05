import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TreatmentType } from "./schemas/treatment-type.schema";
import {
  CreateTreatmentTypeDto,
  UpdateTreatmentTypeDto,
} from "./dto/treatment-type.dto";

@Injectable()
export class TreatmentTypesService {
  constructor(
    @InjectModel(TreatmentType.name)
    private treatmentTypeModel: Model<TreatmentType>,
  ) { }

  async create(createDto: CreateTreatmentTypeDto): Promise<TreatmentType> {
    const newTreatmentType = new this.treatmentTypeModel(createDto);
    return await newTreatmentType.save();
  }

  async findAll(): Promise<TreatmentType[]> {
    return await this.treatmentTypeModel
      .find({ isDeleted: false, isActive: true, status: "Active" })
      .exec();
  }

  async findAllForManagement(): Promise<TreatmentType[]> {
    return await this.treatmentTypeModel.find({ isDeleted: false }).exec();
  }

  async findOne(id: string): Promise<TreatmentType> {
    return await this.treatmentTypeModel
      .findOne({ _id: id, isDeleted: false })
      .exec();
  }

  async update(
    id: string,
    updateDto: UpdateTreatmentTypeDto,
  ): Promise<TreatmentType> {
    return await this.treatmentTypeModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.treatmentTypeModel
      .findByIdAndUpdate(id, { isDeleted: true, isActive: false })
      .exec();
  }
}
