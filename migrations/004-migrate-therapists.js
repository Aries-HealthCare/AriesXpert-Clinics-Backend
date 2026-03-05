// Migration Script 4: Migrate and validate therapists
// Run: mongosh < 004-migrate-therapists.js

db = db.getSiblingDB('ariesxpert');

console.log('=== Migration 4: Migrate Therapists ===');
console.log('Starting therapist data migration...');

// Check if old 'experts' collection exists
const expertsCollectionExists = db.getCollectionNames().includes('experts');

let migratedCount = 0;
let skippedCount = 0;

if (expertsCollectionExists) {
  const experts = db.experts.find({ isDeleted: { $ne: true } }).toArray();
  console.log(`Found ${experts.length} experts to migrate to therapists`);

  experts.forEach((expert) => {
    try {
      // Check if therapist already exists
      const existingTherapist = db.therapists.findOne({
        $or: [
          { email: expert.email },
          { phone: expert.phone },
          { licenseNumber: expert.professionalInfo?.licenseNumber }
        ],
      });

      if (existingTherapist) {
        skippedCount++;
        console.log(`⚠️  Therapist already exists for ${expert.email}, skipping`);
        return;
      }

      // Convert expert to therapist
      const therapistData = {
        firstName: expert.firstName || 'Therapist',
        lastName: expert.lastName || '',
        email: expert.email || '',
        phone: expert.phone || '',
        countryCode: expert.countryCode || '+91',
        specialization: expert.professionalInfo?.professionalRole || 'physiotherapy',
        experience: parseInt(expert.professionalInfo?.experience) || 0,
        licenseNumber: expert.professionalInfo?.licenseNumber || expert._id.toString(),
        city: expert.city || '',
        state: expert.state || '',
        area: expert.area || '',
        streetAddress: expert.streetAddress || '',
        addressLineTwo: expert.addressLineTwo || '',
        zipCode: expert.zipCode || '',
        profilePhoto: expert.profilePhoto || '',
        aadharNumber: expert.aadharNumber || '',
        aadharCard: expert.aadharCard || '',
        aadharCardBack: expert.aadharCardBack || '',
        dob: expert.dob || null,
        fcmToken: expert.fcmToken || '',
        deviceBrand: expert.deviceBrand || '',
        deviceModel: expert.deviceModel || '',
        osVersion: expert.osVersion || '',
        osType: expert.osType || '',
        professionalInfo: expert.professionalInfo || {},
        bankInfo: expert.bankInfo || {},
        areaOfServiceInfo: expert.areaOfServiceInfo || {},
        isActive: expert.isActive !== false,
        isDeleted: expert.isDeleted === true,
        createdAt: expert.createdAt || new Date(),
        updatedAt: expert.updatedAt || new Date(),
      };

      const result = db.therapists.insertOne(therapistData);
      migratedCount++;
      console.log(`✅ Migrated expert ${expert._id.toString().slice(0, 8)} as therapist`);
    } catch (error) {
      console.error(`❌ Error migrating expert ${expert._id}: ${error.message}`);
    }
  });
} else {
  console.log('ℹ️  No experts collection found - therapists already migrated or data structure differs');
}

// Validate all therapists have required fields
console.log('Validating existing therapists...');
const therapists = db.therapists.find({ isDeleted: { $ne: true } }).toArray();
console.log(`Validating ${therapists.length} therapists`);

let validatedCount = 0;

therapists.forEach((therapist) => {
  try {
    const updates = {};

    if (!therapist.licenseNumber) {
      updates.licenseNumber = therapist._id.toString();
    }
    if (!therapist.firstName) {
      updates.firstName = 'Therapist';
    }
    if (!therapist.specialization) {
      updates.specialization = 'physiotherapy';
    }
    if (therapist.isActive === undefined) {
      updates.isActive = true;
    }
    if (therapist.isDeleted === undefined) {
      updates.isDeleted = false;
    }

    if (Object.keys(updates).length > 0) {
      db.therapists.updateOne({ _id: therapist._id }, { $set: updates });
      validatedCount++;
    }
  } catch (error) {
    console.error(`❌ Error validating therapist ${therapist._id}: ${error.message}`);
  }
});

console.log(`✅ Therapist migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${validatedCount} validated`);
