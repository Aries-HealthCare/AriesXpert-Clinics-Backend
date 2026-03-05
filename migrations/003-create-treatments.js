// Migration Script 3: Validate and create treatments
// Run: mongosh < 003-create-treatments.js

db = db.getSiblingDB('ariesxpert');

console.log('=== Migration 3: Create/Validate Treatments ===');
console.log('Starting treatment data validation...');

const treatments = db.treatments.find({ isDeleted: { $ne: true } }).toArray();
console.log(`Found ${treatments.length} treatments to validate`);

let updated = 0;
let errors = 0;
let skipped = 0;

treatments.forEach((treatment) => {
  try {
    // Validate patient and expert references exist
    if (!treatment.patient || !treatment.expert) {
      skipped++;
      console.log(`⚠️  Skipping treatment ${treatment._id}: missing patient or expert`);
      return;
    }

    const updates = {};

    // Ensure required fields
    if (!treatment.treatmentName) {
      updates.treatmentName = `Treatment ${treatment._id.toString().slice(0, 8)}`;
    }
    if (!treatment.startDate) {
      updates.startDate = new Date();
    }
    if (!treatment.preferenceTime) {
      updates.preferenceTime = '10:00 AM';
    }
    if (!treatment.paymentStatus) {
      updates.paymentStatus = 'Unpaid';
    }
    if (treatment.isActive === undefined) {
      updates.isActive = true;
    }
    if (treatment.isDeleted === undefined) {
      updates.isDeleted = false;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      db.treatments.updateOne({ _id: treatment._id }, { $set: updates });
      updated++;
    }
  } catch (error) {
    errors++;
    console.error(`❌ Error processing treatment ${treatment._id}: ${error.message}`);
  }
});

console.log(`✅ Treatment validation complete: ${updated} updated, ${skipped} skipped, ${errors} errors`);
