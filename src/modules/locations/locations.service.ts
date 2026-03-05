import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Country, CountryDocument,
  State, StateDocument,
  City, CityDocument,
  SubArea, SubAreaDocument,
  Area, AreaDocument,
  Pincode, PincodeDocument
} from "./schemas/location.schema";

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
    @InjectModel(SubArea.name) private subAreaModel: Model<SubAreaDocument>,
    @InjectModel(Area.name) private areaModel: Model<AreaDocument>,
    @InjectModel(Pincode.name) private pincodeModel: Model<PincodeDocument>,
  ) { }

  async getCountries() {
    return this.countryModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  async getStates(countryId: string) {
    return this.stateModel.find({ countryId, active: true }).sort({ name: 1 }).exec();
  }

  async getCities(stateId: string) {
    return this.cityModel.find({ stateId, active: true }).sort({ name: 1 }).exec();
  }

  async getSubAreas(cityId: string) {
    return this.subAreaModel.find({ cityId, active: true }).sort({ name: 1 }).exec();
  }

  async getAreas(subAreaId: string) {
    return this.areaModel.find({ subAreaId, active: true }).sort({ name: 1 }).exec();
  }

  async getPincodes(areaId: string) {
    return this.pincodeModel.find({ areaId }).sort({ pincode: 1 }).exec();
  }

  async createCountry(name: string, isoCode: string) {
    return this.countryModel.findOneAndUpdate(
      { isoCode },
      { $set: { name } },
      { upsert: true, new: true }
    );
  }

  async createState(name: string, countryId: string, stateCode?: string) {
    return this.stateModel.findOneAndUpdate(
      { name, countryId },
      { $set: { stateCode } },
      { upsert: true, new: true }
    );
  }

  async createCity(name: string, stateId: string) {
    return this.cityModel.findOneAndUpdate(
      { name, stateId },
      { upsert: true, new: true }
    );
  }

  async createSubArea(name: string, cityId: string) {
    return this.subAreaModel.findOneAndUpdate(
      { name, cityId },
      { upsert: true, new: true }
    );
  }

  async createArea(name: string, subAreaId: string) {
    return this.areaModel.findOneAndUpdate(
      { name, subAreaId },
      { upsert: true, new: true }
    );
  }

  async createPincode(pincode: string, areaId: string, lat?: number, lng?: number) {
    return this.pincodeModel.findOneAndUpdate(
      { pincode, areaId },
      { $set: { latitude: lat, longitude: lng } },
      { upsert: true, new: true }
    );
  }
}
