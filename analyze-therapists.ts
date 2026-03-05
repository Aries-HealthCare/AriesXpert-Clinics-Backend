
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function analyzeAppointments() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const collection = db.collection('appointments');
  const cursor = collection.find({}).limit(100);
  
  const fieldStats = {
      therapist: 0,
      therapistId: 0,
      expert: 0,
      expertId: 0,
      other: 0
  };
  
  const sampleIds = new Set<string>();

  while(await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc.therapist) { fieldStats.therapist++; sampleIds.add(doc.therapist.toString()); }
      if (doc.therapistId) { fieldStats.therapistId++; sampleIds.add(doc.therapistId.toString()); }
      if (doc.expert) { fieldStats.expert++; sampleIds.add(doc.expert.toString()); }
      if (doc.expertId) { fieldStats.expertId++; sampleIds.add(doc.expertId.toString()); }
  }

  console.log('Field Stats (first 100):', fieldStats);
  console.log('Unique IDs found:', sampleIds.size);
  
  const idsToCheck = Array.from(sampleIds).slice(0, 5);
  console.log('Checking IDs:', idsToCheck);

  const collectionsToCheck = ['users', 'therapists', 'experts', 'doctors', 'providers', 'employees'];
  
  for (const id of idsToCheck) {
      console.log(`\nChecking ID: ${id}`);
      let found = false;
      for (const colName of collectionsToCheck) {
          try {
              const res = await db.collection(colName).findOne({ _id: new ObjectId(id) });
              if (res) {
                  console.log(`  FOUND in "${colName}"! Name: ${res.firstName} ${res.lastName} or ${res.name}`);
                  found = true;
                  break;
              }
          } catch (e) {}
      }
      if (!found) console.log('  Not found in any common collection');
  }

  await client.close();
}

analyzeAppointments().catch(console.error);
