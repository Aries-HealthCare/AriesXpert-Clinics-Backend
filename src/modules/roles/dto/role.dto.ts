import { IsString, IsArray, IsOptional, IsBoolean } from "class-validator";

export class CreateRoleDto {
  @IsString()
  roleName: string;

  @IsArray()
  @IsOptional()
  accessForThisRole?: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  roleName?: string;

  @IsArray()
  @IsOptional()
  accessForThisRole?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
