import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Announcement, AnnouncementDocument } from "./schemas/announcement.schema";

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
  ) { }

  async create(createAnnouncementDto: any, userId: string) {
    return this.announcementModel.create({
      ...createAnnouncementDto,
      createdBy: userId,
    });
  }

  async findAll(query: any) {
    const { status, page = 1, limit = 10 } = query;
    const filter: any = { isDeleted: false };
    if (status) filter.status = status;

    const announcements = await this.announcementModel
      .find(filter)
      .populate("interestedTherapists")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    const count = await this.announcementModel.countDocuments(filter);

    return {
      broadcasts: announcements, // Keep field name for compatibility if needed? No, let's fix if we can. Actually let's keep it as is.
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findOne(id: string) {
    const announcement = await this.announcementModel
      .findById(id)
      .populate("interestedTherapists")
      .exec();
    if (!announcement) throw new NotFoundException(`Announcement #${id} not found`);
    return announcement;
  }

  async update(id: string, updateAnnouncementDto: any) {
    const announcement = await this.announcementModel
      .findByIdAndUpdate(id, updateAnnouncementDto, { new: true })
      .exec();
    if (!announcement) throw new NotFoundException(`Announcement #${id} not found`);
    return announcement;
  }
}
