import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateEmailSettingsDto {
    @IsNotEmpty()
    @IsString()
    host: string;

    @IsNotEmpty()
    @IsNumber()
    port: number;

    @IsNotEmpty()
    @IsString()
    username: string;

    @IsOptional()
    @IsString()
    password: string;

    @IsOptional()
    @IsBoolean()
    tls?: boolean;

    @IsOptional()
    @IsBoolean()
    ssl?: boolean;

    @IsNotEmpty()
    @IsString()
    from_name: string;

    @IsNotEmpty()
    @IsEmail()
    from_email: string;

    @IsOptional()
    @IsEmail()
    reply_to?: string;
}
