import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Franchise, FranchiseDocument } from "./schemas/franchise.schema";

@Injectable()
export class FranchisesService {
  constructor(
    @InjectModel(Franchise.name)
    private franchiseModel: Model<FranchiseDocument>,
  ) {}

  async create(data: any): Promise<Franchise> {
    const newFranchise = new this.franchiseModel(data);
    return newFranchise.save();
  }

  async findAll(): Promise<Franchise[]> {
    return this.franchiseModel.find().exec();
  }

  async findOne(id: string): Promise<Franchise> {
    return this.franchiseModel.findById(id).exec();
  }

  async update(id: string, data: any): Promise<Franchise> {
    return this.franchiseModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async remove(id: string): Promise<any> {
    return this.franchiseModel.findByIdAndDelete(id).exec();
  }
}
