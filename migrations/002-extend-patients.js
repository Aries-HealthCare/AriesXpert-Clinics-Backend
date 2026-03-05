// Migration Script 2: Extend patients with missing fields
// Run: mongosh < 002-extend-patients.js

db = db.getSiblingDB('ariesxpert');

console.log('=== Migration 2: Extend Patients ===');
console.log('Starting patient schema extension...');

const patients = db.patients.find({ isDeleted: { $ne: true } }).toArray();
console.log(`Found ${patients.length} patients to extend`);

let updated = 0;
let errors = 0;

patients.forEach((patient) => {
  try {
    const updates = {};

    // Add missing fields with defaults
    if (!patient.countryCode) {
      updates.countryCode = '+91';
    }
    if (!patient.bloodGroup) {
      updates.bloodGroup = 'Unknown';
    }
    if (!patient.allergies) {
      updates.allergies = [];
    }
    if (!patient.currentMedications) {
      updates.currentMedications = [];
    }
    if (!patient.emergencyContact) {
      updates.emergencyContact = {
        contactName: '',
        relationship: '',
        countryCode: '+91',
        contactNumber: '',
      };
    }
    if (!patient.stage) {
      updates.stage = 'Patient';
    }
    if (patient.isActive === undefined) {
      updates.isActive = true;
    }
    if (patient.isDeleted === undefined) {
      updates.isDeleted = false;
    }

    if (Object.keys(updates).length > 0) {
      db.patients.updateOne({ _id: patient._id }, { $set: updates });
      updated++;
    }
  } catch (error) {
    errors++;
    console.error(`❌ Error extending patient ${patient._id}: ${error.message}`);
  }
});

console.log(`✅ Patient extension complete: ${updated} updated, ${errors} errors`);
