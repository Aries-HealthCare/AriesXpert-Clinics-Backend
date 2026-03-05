import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CountryDocument = Country & Document;
export type StateDocument = State & Document;
export type CityDocument = City & Document;
export type SubAreaDocument = SubArea & Document;
export type AreaDocument = Area & Document;
export type PincodeDocument = Pincode & Document;

@Schema()
export class Country {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  isoCode: string;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  currency: string;

  @Prop()
  currencySymbol: string;

  @Prop()
  timezone: string;

  @Prop()
  language: string;

  @Prop()
  taxType: string;

  @Prop()
  taxPercentage: number;
}

@Schema()
export class State {
  @Prop({ required: true })
  name: string;

  @Prop()
  stateCode: string;

  @Prop({ type: Types.ObjectId, ref: "Country", required: true, index: true })
  countryId: Types.ObjectId;

  @Prop({ default: true })
  active: boolean;
}

@Schema()
export class City {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: "State", required: true, index: true })
  stateId: Types.ObjectId;

  @Prop({ default: true })
  active: boolean;
}

@Schema()
export class SubArea {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: "City", required: true, index: true })
  cityId: Types.ObjectId;

  @Prop({ default: true })
  active: boolean;
}

@Schema()
export class Area {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: "SubArea", required: true, index: true })
  subAreaId: Types.ObjectId;

  @Prop({ default: true })
  active: boolean;
}

@Schema()
export class Pincode {
  @Prop({ required: true })
  pincode: string;

  @Prop({ type: Types.ObjectId, ref: "Area", required: true, index: true })
  areaId: Types.ObjectId;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
export const StateSchema = SchemaFactory.createForClass(State);
export const CitySchema = SchemaFactory.createForClass(City);
export const SubAreaSchema = SchemaFactory.createForClass(SubArea);
export const AreaSchema = SchemaFactory.createForClass(Area);
export const PincodeSchema = SchemaFactory.createForClass(Pincode);

// Indexes
PincodeSchema.index({ pincode: 1, areaId: 1 }, { unique: true });
CitySchema.index({ name: 1, stateId: 1 }, { unique: true });
StateSchema.index({ name: 1, countryId: 1 }, { unique: true });
SubAreaSchema.index({ name: 1, cityId: 1 }, { unique: true });
AreaSchema.index({ name: 1, subAreaId: 1 }, { unique: true });
