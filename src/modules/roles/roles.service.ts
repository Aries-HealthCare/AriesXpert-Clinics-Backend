import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Role } from "./schemas/role.schema";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) { }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const newRole = new this.roleModel(createRoleDto);
    return await newRole.save();
  }

  async findAll(): Promise<Role[]> {
    return await this.roleModel.find({ isDeleted: false }).exec();
  }

  async findOne(id: string): Promise<Role> {
    return await this.roleModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    return await this.roleModel
      .findByIdAndUpdate(id, updateRoleDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.roleModel
      .findByIdAndUpdate(id, { isDeleted: true, isActive: false })
      .exec();
  }
}
