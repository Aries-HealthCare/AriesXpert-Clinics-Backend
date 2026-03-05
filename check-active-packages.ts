
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkActivePackages() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const count = await db.collection('packages').countDocuments({ isDeleted: false });
  console.log('Active packages count:', count);
  
  const allCount = await db.collection('packages').countDocuments({});
  console.log('Total packages count:', allCount);

  await client.close();
}

checkActivePackages().catch(console.error);
