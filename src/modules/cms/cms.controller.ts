import { Controller, Get, Param, Query } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsPageType } from "./schemas/cms-page.schema";

@Controller("cms")
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get("pages")
  getPages() {
    return this.cmsService.findAllPublished(CmsPageType.PAGE);
  }

  @Get("pages/:slug")
  getPageBySlug(@Param("slug") slug: string) {
    return this.cmsService.findBySlug(slug);
  }

  @Get("blogs")
  getBlogs() {
    return this.cmsService.findAllPublished(CmsPageType.BLOG);
  }

  @Get("services")
  getServices() {
    return this.cmsService.findAllPublished(CmsPageType.SERVICE);
  }

  @Get("landing")
  getLandingPage(@Query("cityId") cityId: string) {
    return this.cmsService.findLandingPage(cityId);
  }
}
