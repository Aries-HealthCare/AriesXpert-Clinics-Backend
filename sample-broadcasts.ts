
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function sampleData() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('--- Sampling "broadcasts" ---');
  const broadcast = await db.collection('broadcasts').findOne({});
  console.log(JSON.stringify(broadcast, null, 2));

  if (broadcast) {
      console.log('--- Sampling "broadcastlistings" for this broadcast ---');
      // Assuming broadcastlistings links via broadcastId or similar
      const listing = await db.collection('broadcastlistings').findOne({ broadcastId: broadcast._id });
      console.log('By broadcastId (ObjectId):', JSON.stringify(listing, null, 2));
      
      if (!listing) {
           const listingStr = await db.collection('broadcastlistings').findOne({ broadcastId: broadcast._id.toString() });
           console.log('By broadcastId (String):', JSON.stringify(listingStr, null, 2));
      }
  }
  
  console.log('--- Sampling any "broadcastlistings" ---');
  const anyListing = await db.collection('broadcastlistings').findOne({});
  console.log(JSON.stringify(anyListing, null, 2));

  await client.close();
}

sampleData().catch(console.error);
