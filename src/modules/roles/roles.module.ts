import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { Role, RoleSchema } from "./schemas/role.schema";
import { RolePermission, RolePermissionSchema } from "./schemas/role-permission.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule { }
