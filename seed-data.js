const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://arieshealthcare:Aries%40786@ariesxpert.x8ndzni.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=ariesxpert';

async function seedData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Update broadcasts to be active and not deleted
    console.log('📝 Updating broadcasts...');
    const broadcastsResult = await db.collection('broadcasts').updateMany(
      {},
      {
        $set: { isDeleted: false, isActive: true }
      }
    );
    console.log(`✅ Updated ${broadcastsResult.modifiedCount} broadcasts\n`);

    // Update treatments to be active and not deleted
    console.log('📝 Updating treatments...');
    const treatmentsResult = await db.collection('treatments').updateMany(
      {},
      {
        $set: { isDeleted: false, isActive: true }
      }
    );
    console.log(`✅ Updated ${treatmentsResult.modifiedCount} treatments\n`);

    // Update visits/appointments to be active and not deleted
    console.log('📝 Updating visits/appointments...');
    const visitsResult = await db.collection('visits').updateMany(
      {},
      {
        $set: { isDeleted: false, isActive: true }
      }
    );
    console.log(`✅ Updated ${visitsResult.modifiedCount} visits\n`);

    // Update patients to be active and not deleted
    console.log('📝 Updating patients...');
    const patientsResult = await db.collection('patients').updateMany(
      {},
      {
        $set: { isDeleted: false, isActive: true }
      }
    );
    console.log(`✅ Updated ${patientsResult.modifiedCount} patients\n`);

    // Update therapists to be active and not deleted
    console.log('📝 Updating therapists...');
    const therapistsResult = await db.collection('therapists').updateMany(
      {},
      {
        $set: { isDeleted: false, isActive: true }
      }
    );
    console.log(`✅ Updated ${therapistsResult.modifiedCount} therapists\n`);

    // Verify the updates
    console.log('🔍 Verifying updates...\n');

    const broadcastsCount = await db.collection('broadcasts').countDocuments({ isDeleted: false });
    console.log(`Broadcasts (not deleted): ${broadcastsCount}`);

    const treatmentsCount = await db.collection('treatments').countDocuments({ isDeleted: false });
    console.log(`Treatments (not deleted): ${treatmentsCount}`);

    const visitsCount = await db.collection('visits').countDocuments({ isDeleted: false });
    console.log(`Visits (not deleted): ${visitsCount}`);

    const patientsCount = await db.collection('patients').countDocuments({ isDeleted: false });
    console.log(`Patients (not deleted): ${patientsCount}`);

    const therapistsCount = await db.collection('therapists').countDocuments({ isDeleted: false });
    console.log(`Therapists (not deleted): ${therapistsCount}`);

    console.log('\n✅ Data seeding complete!');
    console.log('\nYour admin dashboard should now show all data.');
    console.log('Restart your backend server to see the changes.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedData();
