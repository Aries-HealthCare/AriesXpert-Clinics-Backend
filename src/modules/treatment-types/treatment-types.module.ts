import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TreatmentTypesController } from "./treatment-types.controller";
import { TreatmentTypesService } from "./treatment-types.service";
import { TreatmentType, TreatmentTypeSchema } from "./schemas/treatment-type.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TreatmentType.name, schema: TreatmentTypeSchema }]),
  ],
  controllers: [TreatmentTypesController],
  providers: [TreatmentTypesService],
  exports: [TreatmentTypesService],
})
export class TreatmentTypesModule { }
