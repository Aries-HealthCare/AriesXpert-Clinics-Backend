
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkPackages() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('--- Checking "packages" collection ---');
  const count = await db.collection('packages').countDocuments();
  console.log('Total packages:', count);

  if (count > 0) {
      const sample = await db.collection('packages').findOne({});
      console.log('Sample Package:', JSON.stringify(sample, null, 2));
  } else {
      console.log('No packages found in "packages" collection.');
  }

  await client.close();
}

checkPackages().catch(console.error);
