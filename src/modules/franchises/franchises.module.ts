import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FranchisesController } from "./franchises.controller";
import { FranchisesService } from "./franchises.service";
import { Franchise, FranchiseSchema } from "./schemas/franchise.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Franchise.name, schema: FranchiseSchema },
    ]),
  ],
  controllers: [FranchisesController],
  providers: [FranchisesService],
  exports: [FranchisesService],
})
export class FranchisesModule {}
