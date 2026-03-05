import { AsyncLocalStorage } from 'async_hooks';

export interface TenantData {
    clinicId: string;
    databaseName: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantData>();
