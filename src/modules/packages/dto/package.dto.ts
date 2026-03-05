import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
} from "class-validator";

export class CreatePackageDto {
  @IsString()
  packageName: string;

  @IsString()
  description: string;

  @IsNumber()
  numberOfSessions: number;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsNumber()
  price: number;

  @IsArray()
  visitFrequency: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  treatmentPlan: string;

  @IsArray()
  @IsOptional()
  features?: string[];
}

export class UpdatePackageDto {
  @IsString()
  @IsOptional()
  packageName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  numberOfSessions?: number;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsArray()
  @IsOptional()
  visitFrequency?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  treatmentPlan?: string;

  @IsArray()
  @IsOptional()
  features?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
