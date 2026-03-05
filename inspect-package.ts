
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkPackageStructure() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const pkg = await db.collection('packages').findOne({});
  console.log('Sample Package Structure:', JSON.stringify(pkg, null, 2));

  await client.close();
}

checkPackageStructure().catch(console.error);
