import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RegisteredClinic, RegisteredClinicSchema } from "./schemas/registered-clinic.schema";
import { RegistryService } from "./registry.service";

@Global()
@Module({
    imports: [
        MongooseModule.forFeature(
            [{ name: RegisteredClinic.name, schema: RegisteredClinicSchema }],
            'registry' // This will use the 'registry' connection
        ),
    ],
    providers: [RegistryService],
    exports: [RegistryService],
})
export class RegistryModule { }
