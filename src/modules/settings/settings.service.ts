import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  GlobalSetting,
  GlobalSettingDocument,
} from "./schemas/global-setting.schema";

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache = new Map<string, any>();

  constructor(
    @InjectModel(GlobalSetting.name)
    private settingModel: Model<GlobalSettingDocument>,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    const settings = await this.settingModel.find().exec();
    this.cache.clear();
    settings.forEach((s) => this.cache.set(s.key, s.value));
  }

  async findAll() {
    return this.settingModel.find().exec();
  }

  async findByKey(key: string) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const setting = await this.settingModel.findOne({ key }).exec();
    if (setting) {
      this.cache.set(key, setting.value);
      return setting.value;
    }
    return null;
  }

  async update(key: string, value: any, description?: string) {
    const setting = await this.settingModel
      .findOneAndUpdate(
        { key },
        { key, value, description },
        { new: true, upsert: true },
      )
      .exec();

    this.cache.set(key, value);
    return setting;
  }
}
