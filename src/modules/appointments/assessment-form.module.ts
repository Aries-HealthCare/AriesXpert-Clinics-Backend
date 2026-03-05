import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AssessmentForm, AssessmentFormSchema } from "./assessment-form.model";
import { AssessmentFormService } from "./assessment-form.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AssessmentForm.name,
        schema: AssessmentFormSchema,
      },
    ]),
  ],
  providers: [AssessmentFormService],
  exports: [AssessmentFormService],
})
export class AssessmentFormModule {}
