import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class TenantConnectionService {
    private readonly logger = new Logger(TenantConnectionService.name);

    constructor(
        @InjectConnection() private readonly mainConnection: Connection,
    ) { }

    /**
     * Returns the database connection for the current tenant in the context.
     * 
     * REFACTORED: Now always returns the main database connection (AriesXpert).
     * This ensures that all data (Patients, Visits, Treatments, etc.) for all clinics
     * stays in the central database with clinicId isolation, rather than being 
     * split across dynamic tenant databases.
     */
    async getTenantConnection(): Promise<Connection> {
        // Always return the main connection to ensure all data stays in AriesXpert
        return this.mainConnection;
    }

    /**
     * Helper to get a model for the current tenant
     */
    async getTenantModel<T>(modelName: string, schema: any): Promise<any> {
        // Always use the main connection models
        return this.mainConnection.model(modelName, schema);
    }

    /**
     * Get the main (ariesxpert) database connection for platform-level operations
     */
    getMainConnection(): Connection {
        return this.mainConnection;
    }
}
