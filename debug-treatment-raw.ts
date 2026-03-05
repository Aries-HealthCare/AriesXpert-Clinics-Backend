
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function debugTreatment() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('--- Fetching latest treatment ---');
  const treatments = await db.collection('treatments').find().sort({createdAt: -1}).limit(1).toArray();
  
  if (treatments.length > 0) {
      const t = treatments[0];
      console.log('Raw Treatment Data:', JSON.stringify(t, null, 2));
      
      // Also check if we can find the one from screenshot if ID was valid
      // But let's just analyze the structure of a real one first.
  } else {
      console.log('No treatments found.');
  }

  await client.close();
}

debugTreatment().catch(console.error);
