
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function debugData() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('--- Searching for Therapist "Sireesha Bodda" ---');
  const therapist = await db.collection('therapists').findOne({ 
      $or: [
          { name: /Sireesha/i },
          { firstName: /Sireesha/i },
          { "professionalInfo.name": /Sireesha/i }
      ]
  });

  if (therapist) {
      console.log('Found Therapist:', JSON.stringify(therapist, null, 2));
      console.log('Therapist ID:', therapist._id);
      
      console.log('--- Searching for Appointment with this Therapist ---');
      const appointment = await db.collection('appointments').findOne({
          $or: [
              { therapist: therapist._id },
              { therapistId: therapist._id },
              { expert: therapist._id },
              { therapist: therapist._id.toString() } // Check string format too
          ]
      });
      
      if (appointment) {
          console.log('Found Appointment:', JSON.stringify(appointment, null, 2));
      } else {
          console.log('No appointment found for this therapist ID');
          
          // Try finding any appointment and see what 'therapist' field looks like
          console.log('--- Sampling an Appointment with "therapist" field ---');
          const sample = await db.collection('appointments').findOne({ therapist: { $exists: true, $ne: null } });
          console.log('Sample Appointment:', JSON.stringify(sample, null, 2));
      }

  } else {
      console.log('Therapist "Sireesha Bodda" not found in "therapists" collection.');
      
      // Check 'users' collection just in case
      const user = await db.collection('users').findOne({ 
        $or: [
            { name: /Sireesha/i },
            { firstName: /Sireesha/i }
        ]
      });
      if (user) {
          console.log('Found in "users" collection:', JSON.stringify(user, null, 2));
      }
  }

  await client.close();
}

debugData().catch(console.error);
