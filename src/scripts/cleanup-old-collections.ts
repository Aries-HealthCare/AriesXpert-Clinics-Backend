/**
 * Cleanup Script: Remove clinic collections from ariesxpert database
 * 
 * WARNING: Only run this AFTER successful migration and verification!
 * This script permanently removes clinic-related collections from ariesxpert database.
 * 
 * Usage:
 * npx ts-node src/scripts/cleanup-old-collections.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';

// Collections to remove from ariesxpert database after migration
const COLLECTIONS_TO_REMOVE = [
    'clinics',
    'clinic_users',
    'patients',
    'visits',
    'appointments',
    'treatments',
    'packages',
    'attendances',
    'salaries',
    'payrolls',
    'leads',
    'assessments',
    'assessmenttemplates',
    'followups',
    'roles',
    'rolepermissions',
    'invoices',
    'ledgers',
    'clinic_accounts',
    'clinicaccounts',
    'paymenttransactions',
    'payment_transactions',
    'treatmenttypes',
    'treatment_types',
    'broadcasts',
    'broadcastlistings',
    'broadcast_listings',
];

async function confirmCleanup(): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE clinic collections from ariesxpert database!');
        console.log('Make sure you have:');
        console.log('  1. Backed up your database');
        console.log('  2. Successfully migrated data to clinic database');
        console.log('  3. Verified the migration\n');
        
        rl.question('Type "DELETE" to confirm: ', (answer) => {
            rl.close();
            resolve(answer === 'DELETE');
        });
    });
}

async function cleanupOldCollections() {
    // Skip confirmation in non-interactive mode
    const skipConfirm = process.argv.includes('--force');
    
    if (!skipConfirm) {
        const confirmed = await confirmCleanup();
        if (!confirmed) {
            console.log('Cleanup cancelled.');
            process.exit(0);
        }
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('\nConnected to MongoDB');

        const ariesxpertDb = client.db('ariesxpert_dev');
        const clinicDb = client.db('clinic');

        const results: any[] = [];

        for (const collectionName of COLLECTIONS_TO_REMOVE) {
            try {
                // First verify data exists in clinic database
                let targetName = collectionName;
                if (collectionName === 'visits') targetName = 'appointments';
                if (collectionName === 'assessmenttemplates') targetName = 'assessment_templates';
                if (collectionName === 'rolepermissions') targetName = 'role_permissions';
                if (collectionName === 'clinicaccounts') targetName = 'clinic_accounts';
                if (collectionName === 'paymenttransactions') targetName = 'payment_transactions';
                if (collectionName === 'treatmenttypes') targetName = 'treatment_types';
                if (collectionName === 'broadcastlistings') targetName = 'broadcast_listings';

                const clinicCount = await clinicDb.collection(targetName).countDocuments();
                const ariesCount = await ariesxpertDb.collection(collectionName).countDocuments();

                if (ariesCount === 0) {
                    console.log(`Skipping ${collectionName}: No documents in source`);
                    continue;
                }

                if (clinicCount === 0) {
                    console.log(`⚠️  Warning: ${targetName} is empty in clinic database! Skipping deletion of ${collectionName}`);
                    results.push({
                        collection: collectionName,
                        status: 'skipped',
                        reason: 'Target collection empty - migration may have failed'
                    });
                    continue;
                }

                // Drop the collection from ariesxpert database
                console.log(`Dropping ${collectionName} from ariesxpert_dev (${ariesCount} documents)...`);
                await ariesxpertDb.collection(collectionName).drop();
                
                results.push({
                    collection: collectionName,
                    status: 'deleted',
                    documentsRemoved: ariesCount
                });

            } catch (error: any) {
                if (error.codeName === 'NamespaceNotFound') {
                    console.log(`Skipping ${collectionName}: Collection does not exist`);
                } else {
                    console.error(`Error processing ${collectionName}:`, error.message);
                    results.push({
                        collection: collectionName,
                        status: 'error',
                        error: error.message
                    });
                }
            }
        }

        // Print cleanup summary
        console.log('\n========== CLEANUP SUMMARY ==========');
        console.log('Collection'.padEnd(30) + 'Status'.padEnd(15) + 'Documents');
        console.log('-'.repeat(60));
        
        for (const result of results) {
            const status = result.status === 'deleted' ? '✓ Deleted' : 
                          result.status === 'skipped' ? '⊘ Skipped' : '✗ Error';
            const count = result.documentsRemoved || 0;
            console.log(result.collection.padEnd(30) + status.padEnd(15) + count);
        }

        console.log('\n========== CLEANUP COMPLETE ==========\n');

    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

cleanupOldCollections().catch(console.error);
