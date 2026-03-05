import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { tenantLocalStorage } from './tenant.context';
import { RegistryService } from '../../modules/registry/registry.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    private readonly logger = new Logger(TenantMiddleware.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly registryService: RegistryService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next();
        }

        try {
            const payload: any = this.jwtService.decode(token);

            // If the user belongs to a clinic, we need to resolve their database
            if (payload && payload.clinicId) {
                const clinicId = payload.clinicId;

                let databaseName = payload.databaseName;

                // If databaseName is not in token, look it up in registry
                if (!databaseName) {
                    const registryEntry = await this.registryService.getClinicRegistry(clinicId);
                    if (registryEntry) {
                        databaseName = registryEntry.databaseName;
                    }
                }

                if (databaseName) {
                    // Set the tenant context for the duration of this request
                    return tenantLocalStorage.run({ clinicId, databaseName }, () => {
                        // For debugging
                        (req as any).tenant = { clinicId, databaseName };
                        next();
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Error resolving tenant: ${error.message}`);
        }

        next();
    }
}
