import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RoyaltiesController } from "./royalties.controller";
import { RoyaltiesService } from "./royalties.service";
import { Royalty, RoyaltySchema } from "./schemas/royalty.schema";
import { Visit, VisitSchema } from "../appointments/schemas/visit.schema";
import {
  Franchise,
  FranchiseSchema,
} from "../franchises/schemas/franchise.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Royalty.name, schema: RoyaltySchema },
      { name: Franchise.name, schema: FranchiseSchema },
    ]),
  ],
  controllers: [RoyaltiesController],
  providers: [RoyaltiesService],
  exports: [RoyaltiesService],
})
export class RoyaltiesModule { }
