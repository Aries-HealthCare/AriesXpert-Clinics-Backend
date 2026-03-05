
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function listCollections() {
  console.log('Connecting to MongoDB...', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:');
  collections.forEach(c => console.log(`- ${c.name}`));

  await mongoose.disconnect();
}

listCollections().catch(console.error);
