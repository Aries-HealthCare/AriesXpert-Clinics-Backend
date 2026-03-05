import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Package, PackageDocument } from "./schemas/package.schema";

@Injectable()
export class PackagesService {
  constructor(
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
  ) { }

  async create(createPackageDto: any): Promise<Package> {
    const data = {
      ...createPackageDto,
      packageName: createPackageDto.name || createPackageDto.packageName,
      numberOfSessions: createPackageDto.sessions || createPackageDto.numberOfSessions,
      duration: createPackageDto.days?.toString() || createPackageDto.duration,
      price: createPackageDto.basePrice || createPackageDto.price,
      description: createPackageDto.description || "No description provided",
      treatmentPlan: createPackageDto.treatmentPlan || "Standard Plan",
      visitFrequency: createPackageDto.visitFrequency || [],
    };
    const newPackage = new this.packageModel(data);
    return await newPackage.save();
  }

  async findAll(userClinicId?: string): Promise<any[]> {
    const filter: any = { isDeleted: false };
    if (userClinicId) filter.clinicId = userClinicId;

    const packages = await this.packageModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    return packages.map((pkg) => this.transformPackage(pkg));
  }

  async findOne(id: string): Promise<any> {
    const pkg = await this.packageModel.findOne({ _id: id, isDeleted: false }).lean().exec();
    return pkg ? this.transformPackage(pkg) : null;
  }

  async update(id: string, updatePackageDto: any): Promise<Package> {
    const data: any = { ...updatePackageDto };
    if (updatePackageDto.name) data.packageName = updatePackageDto.name;
    if (updatePackageDto.sessions) data.numberOfSessions = updatePackageDto.sessions;
    if (updatePackageDto.days) data.duration = updatePackageDto.days.toString();
    if (updatePackageDto.basePrice) data.price = updatePackageDto.basePrice;

    return await this.packageModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  private transformPackage(pkg: any): any {
    return {
      id: pkg._id,
      name: pkg.packageName,
      price: `₹${pkg.price || 0}`,
      basePrice: pkg.price,
      sessions: pkg.numberOfSessions,
      days: parseInt(pkg.duration) || 0,
      discountedPrice: pkg.discountedPrice || pkg.price || 0,
      offerAmount: pkg.offerAmount || 0,
      status: pkg.status || "Active",
      country: pkg.country || "",
      state: pkg.state || "",
      city: pkg.city || "",
      area: pkg.areas && pkg.areas.length > 0 ? pkg.areas[0] : pkg.area || "",
      areas: pkg.areas || [],
      pincodes: pkg.pincodes || [],
      popularity: pkg.popularity || "Medium",
      enrollments: 0,
      revenue: "₹0",
      description: pkg.description,
      treatmentPlan: pkg.treatmentPlan,
      visitFrequency: pkg.visitFrequency,
      features: pkg.features,
    };
  }

  async delete(id: string): Promise<void> {
    await this.packageModel.findByIdAndUpdate(id, { isDeleted: true, isActive: false }).exec();
  }
}
