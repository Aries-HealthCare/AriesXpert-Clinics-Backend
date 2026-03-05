
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkPatientAddresses() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('--- Checking Patient Address Structures ---');
  // Fetch a sample of patients to see where city might be hidden
  const patients = await db.collection('patients').find().limit(20).toArray();
  
  patients.forEach(p => {
      console.log(`ID: ${p._id}`);
      console.log(`  Direct City: ${p.city}`);
      console.log(`  Address Field:`, JSON.stringify(p.address));
      console.log(`  Other potential fields: location=${JSON.stringify(p.location)}, contact=${JSON.stringify(p.contactInfo)}`);
      console.log('---');
  });

  await client.close();
}

checkPatientAddresses().catch(console.error);
