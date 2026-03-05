import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  CmsPage,
  CmsPageDocument,
  CmsPageStatus,
  CmsPageType,
} from "./schemas/cms-page.schema";

@Injectable()
export class CmsService implements OnModuleInit {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    @InjectModel(CmsPage.name) private cmsPageModel: Model<CmsPageDocument>,
  ) {}

  async onModuleInit() {
    await this.seedData();
  }

  // --- Public Read APIs ---

  async findAllPublished(type?: CmsPageType) {
    const query: any = { status: CmsPageStatus.PUBLISHED };
    if (type) {
      query.type = type;
    }
    return this.cmsPageModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findBySlug(slug: string) {
    return this.cmsPageModel
      .findOne({ slug, status: CmsPageStatus.PUBLISHED })
      .exec();
  }

  async findLandingPage(cityId: string) {
    return this.cmsPageModel
      .findOne({
        cityId,
        type: CmsPageType.LANDING,
        status: CmsPageStatus.PUBLISHED,
      })
      .exec();
  }

  // --- Admin Write APIs ---

  async adminFindAll(type?: string) {
    const query: any = {};
    if (type) query.type = type;
    return this.cmsPageModel.find(query).sort({ updatedAt: -1 }).exec();
  }

  async create(data: any) {
    return this.cmsPageModel.create(data);
  }

  async update(id: string, data: any) {
    return this.cmsPageModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string) {
    return this.cmsPageModel.findByIdAndDelete(id).exec();
  }

  // --- Seeding ---

  private async seedData() {
    const count = await this.cmsPageModel.countDocuments();
    if (count > 0) return;

    this.logger.log("Seeding initial CMS data...");

    const seeds = [
      {
        title: "About AriesXpert",
        slug: "about-us",
        content:
          "<h1>About Us</h1><p>We are the leading physiotherapy network.</p>",
        type: CmsPageType.PAGE,
        status: CmsPageStatus.PUBLISHED,
        seo: {
          metaTitle: "About Us - AriesXpert",
          metaDescription: "Learn about us",
          keywords: ["about", "physio"],
        },
      },
      {
        title: "Physiotherapy Services",
        slug: "physiotherapy",
        content: "<h1>Physiotherapy</h1><p>Expert care at home.</p>",
        type: CmsPageType.SERVICE,
        status: CmsPageStatus.PUBLISHED,
        seo: {
          metaTitle: "Physiotherapy",
          metaDescription: "Best physio services",
          keywords: ["physio", "services"],
        },
      },
      {
        title: "5 Tips for Back Pain",
        slug: "5-tips-back-pain",
        content: "<p>Here are 5 tips to reduce back pain...</p>",
        type: CmsPageType.BLOG,
        status: CmsPageStatus.PUBLISHED,
        seo: {
          metaTitle: "Back Pain Tips",
          metaDescription: "Relieve back pain",
          keywords: ["back pain", "health"],
        },
      },
      {
        title: "Physiotherapy in Mumbai",
        slug: "physio-mumbai",
        content: "<h1>Mumbai Services</h1><p>We serve all of Mumbai.</p>",
        type: CmsPageType.LANDING,
        status: CmsPageStatus.PUBLISHED,
        // cityId would ideally be a real ObjectId from LocationsModule, but hardcoding or leaving undefined for seed is acceptable if no cities exist yet.
        // We will leave cityId undefined for this generic seed to avoid casting errors.
        seo: {
          metaTitle: "Physio in Mumbai",
          metaDescription: "Mumbai Physio",
          keywords: ["mumbai", "physio"],
        },
      },
    ];

    await this.cmsPageModel.insertMany(seeds);
    this.logger.log("CMS Seeding Complete.");
  }
}
