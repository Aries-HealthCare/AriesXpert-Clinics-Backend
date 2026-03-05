// Migration Script 1: Migrate and validate broadcasts
// Run: mongosh < 001-migrate-broadcasts.js

db = db.getSiblingDB('ariesxpert');

console.log('=== Migration 1: Broadcasts ===');
console.log('Starting broadcast data validation and migration...');

const broadcasts = db.broadcasts.find({ isDeleted: false }).toArray();
console.log(`Found ${broadcasts.length} broadcasts to validate`);

let updated = 0;
let errors = 0;

broadcasts.forEach((broadcast) => {
  try {
    // Ensure patient reference exists
    if (!broadcast.patient) {
      console.log(`⚠️  Broadcast ${broadcast._id} has no patient reference`);
      return;
    }

    const updates = {};

    // Validate and fix location
    if (!broadcast.location || !broadcast.location.city) {
      updates['location.city'] = 'Unknown';
    }
    if (!broadcast.location || !broadcast.location.areas) {
      updates['location.areas'] = [];
    }
    if (!broadcast.location || !broadcast.location.cityId) {
      updates['location.cityId'] = '';
    }

    // Validate other fields
    if (!broadcast.therapistExperience) {
      updates.therapistExperience = '0 years';
    }
    if (!broadcast.serviceTypes) {
      updates.serviceTypes = [];
    }
    if (!broadcast.therapists) {
      updates.therapists = [];
    }
    if (!broadcast.broadcastStatus) {
      updates.broadcastStatus = 'Open';
    }
    if (!broadcast.isActive) {
      updates.isActive = true;
    }

    // Apply updates if needed
    if (Object.keys(updates).length > 0) {
      db.broadcasts.updateOne({ _id: broadcast._id }, { $set: updates });
      updated++;
    }
  } catch (error) {
    errors++;
    console.error(`❌ Error processing broadcast ${broadcast._id}: ${error.message}`);
  }
});

console.log(`✅ Broadcast migration complete: ${updated} updated, ${errors} errors`);
