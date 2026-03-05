import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { LocationsService } from "./locations.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) { }

  @Get("countries")
  getCountries() {
    return this.locationsService.getCountries();
  }

  @Get("states")
  getStates(@Query("countryId") countryId: string) {
    return this.locationsService.getStates(countryId);
  }

  @Get("cities")
  getCities(@Query("stateId") stateId: string) {
    return this.locationsService.getCities(stateId);
  }

  @Get("sub-areas")
  getSubAreas(@Query("cityId") cityId: string) {
    return this.locationsService.getSubAreas(cityId);
  }

  @Get("areas")
  getAreas(@Query("subAreaId") subAreaId: string) {
    return this.locationsService.getAreas(subAreaId);
  }

  @Get("pincodes")
  getPincodes(@Query("areaId") areaId: string) {
    return this.locationsService.getPincodes(areaId);
  }

  // Admin Write APIs
  @UseGuards(AuthGuard("jwt"))
  @Post("countries")
  createCountry(@Body() body: { name: string; isoCode: string }) {
    return this.locationsService.createCountry(body.name, body.isoCode);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("states")
  createState(@Body() body: { name: string; countryId: string; stateCode?: string }) {
    return this.locationsService.createState(body.name, body.countryId, body.stateCode);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("cities")
  createCity(@Body() body: { name: string; stateId: string }) {
    return this.locationsService.createCity(body.name, body.stateId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("sub-areas")
  createSubArea(@Body() body: { name: string; cityId: string }) {
    return this.locationsService.createSubArea(body.name, body.cityId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("areas")
  createArea(@Body() body: { name: string; subAreaId: string }) {
    return this.locationsService.createArea(body.name, body.subAreaId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("pincodes")
  createPincode(@Body() body: { pincode: string; areaId: string; lat?: number; lng?: number }) {
    return this.locationsService.createPincode(body.pincode, body.areaId, body.lat, body.lng);
  }
}
