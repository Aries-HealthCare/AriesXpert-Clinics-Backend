import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import {
  Country, CountrySchema,
  State, StateSchema,
  City, CitySchema,
  SubArea, SubAreaSchema,
  Area, AreaSchema,
  Pincode, PincodeSchema
} from "./schemas/location.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Country.name, schema: CountrySchema },
      { name: State.name, schema: StateSchema },
      { name: City.name, schema: CitySchema },
      { name: SubArea.name, schema: SubAreaSchema },
      { name: Area.name, schema: AreaSchema },
      { name: Pincode.name, schema: PincodeSchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule { }
