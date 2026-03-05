import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CmsController } from "./cms.controller";
import { CmsAdminController } from "./cms.admin.controller";
import { CmsService } from "./cms.service";
import { CmsPage, CmsPageSchema } from "./schemas/cms-page.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CmsPage.name, schema: CmsPageSchema }]),
  ],
  controllers: [CmsController, CmsAdminController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
