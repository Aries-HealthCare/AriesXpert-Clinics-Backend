import { Global, Module } from '@nestjs/common';
import { TenantConnectionService } from './tenant-connection.service';
import { RegistryModule } from '../../modules/registry/registry.module';

@Global()
@Module({
    imports: [RegistryModule],
    providers: [TenantConnectionService],
    exports: [TenantConnectionService],
})
export class MultitenancyModule { }
