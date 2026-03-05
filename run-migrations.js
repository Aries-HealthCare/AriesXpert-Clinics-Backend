const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://arieshealthcare:Aries%40786@ariesxpert.x8ndzni.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=ariesxpert';

async function runMigrations() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check existing collections
    console.log('\n📊 Current Database Collections:');
    const collections = await db.listCollections().toArray();
    console.log(collections.map(c => c.name).join(', '));

    // Get sample data from broadcasts collection
    console.log('\n🔍 Checking broadcasts collection...');
    const broadcastsCount = await db.collection('broadcasts').countDocuments();
    console.log(`Found ${broadcastsCount} broadcasts`);

    if (broadcastsCount > 0) {
      const sample = await db.collection('broadcasts').findOne();
      console.log('Sample broadcast:', JSON.stringify(sample, null, 2).substring(0, 500));
    }

    // Check treatments
    console.log('\n🔍 Checking treatments collection...');
    const treatmentsCount = await db.collection('treatments').countDocuments();
    console.log(`Found ${treatmentsCount} treatments`);

    if (treatmentsCount > 0) {
      const sample = await db.collection('treatments').findOne();
      console.log('Sample treatment:', JSON.stringify(sample, null, 2).substring(0, 500));
    }

    // Check appointments
    console.log('\n🔍 Checking appointments collection...');
    const appointmentsCount = await db.collection('appointments').countDocuments();
    console.log(`Found ${appointmentsCount} appointments`);

    // Check patients
    console.log('\n🔍 Checking patients collection...');
    const patientsCount = await db.collection('patients').countDocuments();
    console.log(`Found ${patientsCount} patients`);

    // Check therapists
    console.log('\n🔍 Checking therapists collection...');
    const therapistsCount = await db.collection('therapists').countDocuments();
    console.log(`Found ${therapistsCount} therapists`);

    console.log('\n✅ Database status check complete!');

    if (broadcastsCount === 0 && treatmentsCount === 0 && appointmentsCount === 0) {
      console.log('\n⚠️  IMPORTANT: No data found in database!');
      console.log('Please run the seed script to populate sample data:');
      console.log('   npm run seed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigrations();
