/**
 * Data Migration Script: ariesxpert -> clinic database
 * 
 * This script safely migrates all clinic-related collections from the 
 * ariesxpert database to the new dedicated clinic database.
 * 
 * Collections to migrate:
 * - clinics -> clinic.clinics
 * - clinic_users -> clinic.clinic_users
 * - patients -> clinic.patients
 * - appointments/visits -> clinic.appointments
 * - treatments -> clinic.treatments
 * - packages -> clinic.packages
 * - attendances -> clinic.attendances
 * - salaries -> clinic.salaries
 * - payrolls -> clinic.payrolls
 * - leads -> clinic.leads
 * - assessments -> clinic.assessments
 * - assessment_templates -> clinic.assessment_templates
 * - followups -> clinic.followups
 * - roles -> clinic.roles
 * - role_permissions -> clinic.role_permissions
 * - invoices -> clinic.invoices
 * - ledgers -> clinic.ledgers
 * - clinic_accounts -> clinic.clinic_accounts
 * - payment_transactions -> clinic.payment_transactions
 * - treatment_types -> clinic.treatment_types
 * - broadcasts -> clinic.broadcasts
 * - broadcast_listings -> clinic.broadcast_listings
 * 
 * Usage:
 * npx ts-node src/scripts/migrate-clinic-data.ts
 * 
 * IMPORTANT: Run this script with a backup of your database first!
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';

// Collections to migrate from ariesxpert to clinic database
const COLLECTIONS_TO_MIGRATE = [
    { source: 'clinics', target: 'clinics' },
    { source: 'clinic_users', target: 'clinic_users' },
    { source: 'patients', target: 'patients' },
    { source: 'visits', target: 'appointments' },          // visits -> appointments
    { source: 'appointments', target: 'appointments' },    // also check appointments collection
    { source: 'treatments', target: 'treatments' },
    { source: 'packages', target: 'packages' },
    { source: 'attendances', target: 'attendances' },
    { source: 'salaries', target: 'salaries' },
    { source: 'payrolls', target: 'payrolls' },
    { source: 'leads', target: 'leads' },
    { source: 'assessments', target: 'assessments' },
    { source: 'assessmenttemplates', target: 'assessment_templates' },
    { source: 'followups', target: 'followups' },
    { source: 'roles', target: 'roles' },
    { source: 'rolepermissions', target: 'role_permissions' },
    { source: 'invoices', target: 'invoices' },
    { source: 'ledgers', target: 'ledgers' },
    { source: 'clinic_accounts', target: 'clinic_accounts' },
    { source: 'clinicaccounts', target: 'clinic_accounts' },
    { source: 'paymenttransactions', target: 'payment_transactions' },
    { source: 'payment_transactions', target: 'payment_transactions' },
    { source: 'treatmenttypes', target: 'treatment_types' },
    { source: 'treatment_types', target: 'treatment_types' },
    { source: 'broadcasts', target: 'broadcasts' },
    { source: 'broadcastlistings', target: 'broadcast_listings' },
    { source: 'broadcast_listings', target: 'broadcast_listings' },
];

async function migrateData() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const sourceDb = client.db('ariesxpert_dev');
        const targetDb = client.db('clinic');

        const migrationResults: any[] = [];

        for (const collection of COLLECTIONS_TO_MIGRATE) {
            try {
                const sourceCollection = sourceDb.collection(collection.source);
                const targetCollection = targetDb.collection(collection.target);

                // Check if source collection exists and has data
                const sourceCount = await sourceCollection.countDocuments();
                
                if (sourceCount === 0) {
                    console.log(`Skipping ${collection.source}: No documents found`);
                    continue;
                }

                // Check if target already has data (avoid duplicate migration)
                const targetCount = await targetCollection.countDocuments();
                
                if (targetCount > 0) {
                    console.log(`Warning: ${collection.target} already has ${targetCount} documents. Skipping to avoid duplicates.`);
                    migrationResults.push({
                        collection: collection.source,
                        status: 'skipped',
                        reason: 'Target already has data',
                        sourceCount,
                        targetCount
                    });
                    continue;
                }

                console.log(`Migrating ${collection.source} -> ${collection.target} (${sourceCount} documents)...`);

                // Fetch all documents from source
                const documents = await sourceCollection.find({}).toArray();

                if (documents.length > 0) {
                    // Insert into target collection
                    const result = await targetCollection.insertMany(documents, { ordered: false });
                    
                    console.log(`  Migrated ${result.insertedCount} documents`);
                    
                    migrationResults.push({
                        collection: collection.source,
                        status: 'success',
                        sourceCount,
                        migratedCount: result.insertedCount
                    });
                }
            } catch (error: any) {
                console.error(`Error migrating ${collection.source}:`, error.message);
                migrationResults.push({
                    collection: collection.source,
                    status: 'error',
                    error: error.message
                });
            }
        }

        // Print migration summary
        console.log('\n========== MIGRATION SUMMARY ==========');
        console.log('Collection'.padEnd(30) + 'Status'.padEnd(15) + 'Documents');
        console.log('-'.repeat(60));
        
        for (const result of migrationResults) {
            const status = result.status === 'success' ? '✓ Success' : 
                          result.status === 'skipped' ? '⊘ Skipped' : '✗ Error';
            const count = result.migratedCount || result.sourceCount || 0;
            console.log(result.collection.padEnd(30) + status.padEnd(15) + count);
        }

        console.log('\n========== MIGRATION COMPLETE ==========\n');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

async function createIndexes() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Creating indexes on clinic database...');

        const db = client.db('clinic');

        // Indexes for clinics collection
        await db.collection('clinics').createIndex({ status: 1 });
        await db.collection('clinics').createIndex({ email: 1 }, { unique: true, sparse: true });
        console.log('  ✓ clinics indexes created');

        // Indexes for clinic_users collection
        await db.collection('clinic_users').createIndex({ clinicId: 1 });
        await db.collection('clinic_users').createIndex({ email: 1 }, { unique: true, sparse: true });
        await db.collection('clinic_users').createIndex({ clinicId: 1, role: 1 });
        await db.collection('clinic_users').createIndex({ clinicId: 1, isActive: 1 });
        console.log('  ✓ clinic_users indexes created');

        // Indexes for patients collection
        await db.collection('patients').createIndex({ clinicId: 1 });
        await db.collection('patients').createIndex({ phone: 1 });
        await db.collection('patients').createIndex({ email: 1 }, { sparse: true });
        await db.collection('patients').createIndex({ clinicId: 1, status: 1 });
        await db.collection('patients').createIndex({ clinicId: 1, createdAt: -1 });
        console.log('  ✓ patients indexes created');

        // Indexes for appointments collection
        await db.collection('appointments').createIndex({ clinicId: 1 });
        await db.collection('appointments').createIndex({ patientId: 1 });
        await db.collection('appointments').createIndex({ therapistId: 1 });
        await db.collection('appointments').createIndex({ clinicId: 1, visitDate: -1 });
        await db.collection('appointments').createIndex({ clinicId: 1, status: 1 });
        await db.collection('appointments').createIndex({ treatment: 1 });
        console.log('  ✓ appointments indexes created');

        // Indexes for treatments collection
        await db.collection('treatments').createIndex({ clinicId: 1 });
        await db.collection('treatments').createIndex({ patient: 1 });
        await db.collection('treatments').createIndex({ expert: 1 });
        await db.collection('treatments').createIndex({ clinicId: 1, isActive: 1 });
        console.log('  ✓ treatments indexes created');

        // Indexes for packages collection
        await db.collection('packages').createIndex({ clinicId: 1 });
        await db.collection('packages').createIndex({ clinicId: 1, isActive: 1 });
        console.log('  ✓ packages indexes created');

        // Indexes for attendances collection
        await db.collection('attendances').createIndex({ clinicId: 1 });
        await db.collection('attendances').createIndex({ staffId: 1 });
        await db.collection('attendances').createIndex({ clinicId: 1, date: -1 });
        await db.collection('attendances').createIndex({ clinicId: 1, staffId: 1, date: 1 });
        console.log('  ✓ attendances indexes created');

        // Indexes for salaries collection
        await db.collection('salaries').createIndex({ clinicId: 1 });
        await db.collection('salaries').createIndex({ staffId: 1 });
        await db.collection('salaries').createIndex({ clinicId: 1, month: 1 });
        console.log('  ✓ salaries indexes created');

        // Indexes for payrolls collection
        await db.collection('payrolls').createIndex({ clinicId: 1 });
        await db.collection('payrolls').createIndex({ staffId: 1, month: 1 }, { unique: true });
        console.log('  ✓ payrolls indexes created');

        // Indexes for leads collection
        await db.collection('leads').createIndex({ clinicId: 1 });
        await db.collection('leads').createIndex({ status: 1 });
        await db.collection('leads').createIndex({ clinicId: 1, status: 1 });
        await db.collection('leads').createIndex({ clinicId: 1, createdAt: -1 });
        console.log('  ✓ leads indexes created');

        // Indexes for assessments collection
        await db.collection('assessments').createIndex({ clinicId: 1 });
        await db.collection('assessments').createIndex({ patientId: 1 });
        await db.collection('assessments').createIndex({ clinicId: 1, patientId: 1 });
        console.log('  ✓ assessments indexes created');

        // Indexes for invoices collection
        await db.collection('invoices').createIndex({ clinicId: 1 });
        await db.collection('invoices').createIndex({ patientId: 1 });
        await db.collection('invoices').createIndex({ status: 1 });
        await db.collection('invoices').createIndex({ clinicId: 1, status: 1 });
        await db.collection('invoices').createIndex({ clinicId: 1, createdAt: -1 });
        await db.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
        console.log('  ✓ invoices indexes created');

        // Indexes for ledgers collection
        await db.collection('ledgers').createIndex({ clinicId: 1 });
        await db.collection('ledgers').createIndex({ userId: 1 });
        await db.collection('ledgers').createIndex({ clinicId: 1, type: 1 });
        console.log('  ✓ ledgers indexes created');

        // Indexes for clinic_accounts collection
        await db.collection('clinic_accounts').createIndex({ clinicId: 1 });
        await db.collection('clinic_accounts').createIndex({ clinicId: 1, type: 1, date: -1 });
        console.log('  ✓ clinic_accounts indexes created');

        // Indexes for payment_transactions collection
        await db.collection('payment_transactions').createIndex({ clinicId: 1 });
        await db.collection('payment_transactions').createIndex({ patientId: 1 });
        await db.collection('payment_transactions').createIndex({ visitId: 1 });
        await db.collection('payment_transactions').createIndex({ status: 1 });
        await db.collection('payment_transactions').createIndex({ paymentLinkId: 1 });
        console.log('  ✓ payment_transactions indexes created');

        // Indexes for roles collection
        await db.collection('roles').createIndex({ clinicId: 1 });
        await db.collection('roles').createIndex({ name: 1 });
        console.log('  ✓ roles indexes created');

        // Indexes for role_permissions collection
        await db.collection('role_permissions').createIndex({ clinicId: 1 });
        await db.collection('role_permissions').createIndex({ clinicId: 1, role: 1 }, { unique: true });
        console.log('  ✓ role_permissions indexes created');

        // Indexes for broadcasts collection
        await db.collection('broadcasts').createIndex({ clinicId: 1 });
        await db.collection('broadcasts').createIndex({ broadcastStatus: 1 });
        await db.collection('broadcasts').createIndex({ clinicId: 1, broadcastStatus: 1 });
        console.log('  ✓ broadcasts indexes created');

        // Indexes for treatment_types collection
        await db.collection('treatment_types').createIndex({ clinicId: 1 });
        await db.collection('treatment_types').createIndex({ isActive: 1 });
        console.log('  ✓ treatment_types indexes created');

        console.log('\n========== ALL INDEXES CREATED ==========\n');

    } catch (error) {
        console.error('Failed to create indexes:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

async function verifyMigration() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('\n========== VERIFICATION ==========\n');

        const clinicDb = client.db('clinic');
        
        const collections = [
            'clinics', 'clinic_users', 'patients', 'appointments', 'treatments',
            'packages', 'attendances', 'salaries', 'leads', 'assessments',
            'invoices', 'ledgers', 'payment_transactions', 'roles', 'broadcasts'
        ];

        console.log('Collection'.padEnd(25) + 'Document Count');
        console.log('-'.repeat(45));

        for (const collName of collections) {
            const count = await clinicDb.collection(collName).countDocuments();
            console.log(collName.padEnd(25) + count);
        }

        console.log('\n========== VERIFICATION COMPLETE ==========\n');

    } finally {
        await client.close();
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--migrate')) {
        await migrateData();
    }
    
    if (args.includes('--indexes')) {
        await createIndexes();
    }
    
    if (args.includes('--verify')) {
        await verifyMigration();
    }
    
    if (args.length === 0 || args.includes('--all')) {
        console.log('Running full migration: migrate -> indexes -> verify\n');
        await migrateData();
        await createIndexes();
        await verifyMigration();
    }

    console.log(`
Usage:
  npx ts-node src/scripts/migrate-clinic-data.ts --all      # Run full migration
  npx ts-node src/scripts/migrate-clinic-data.ts --migrate  # Only migrate data
  npx ts-node src/scripts/migrate-clinic-data.ts --indexes  # Only create indexes
  npx ts-node src/scripts/migrate-clinic-data.ts --verify   # Only verify migration
    `);
}

main().catch(console.error);
