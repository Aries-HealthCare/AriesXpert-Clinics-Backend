
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkTreatments() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('--- Counting "treatments" ---');
  const count = await db.collection('treatments').countDocuments();
  console.log('Total treatments:', count);

  console.log('--- Sample Treatment ---');
  const sample = await db.collection('treatments').findOne({});
  console.log(JSON.stringify(sample, null, 2));

  await client.close();
}

checkTreatments().catch(console.error);
