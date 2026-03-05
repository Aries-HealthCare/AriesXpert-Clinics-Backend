import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateTreatmentTypeDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  professionalRole?: string;
}

export class UpdateTreatmentTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  professionalRole?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
