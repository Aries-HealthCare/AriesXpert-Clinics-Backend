import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  IsEnum,
} from "class-validator";

export enum PaymentSourceType {
  VISIT = "visit",
  SESSION = "session",
  PACKAGE = "package",
  INVOICE = "invoice",
}

export class CreatePaymentLinkDto {
  @IsString()
  visitId: string;

  @IsString()
  patientId: string;

  @IsString()
  therapistId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PaymentSourceType)
  @IsOptional()
  source?: PaymentSourceType = PaymentSourceType.VISIT;

  @IsBoolean()
  @IsOptional()
  notifyPatient?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(1)
  expiryMinutes?: number = 1440; // 24 hours default

  @IsString()
  @IsOptional()
  shortUrl?: string; // Optional short URL for WhatsApp

  metadata?: Record<string, any>;
}
