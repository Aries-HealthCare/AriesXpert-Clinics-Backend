
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function countRecords() {
  console.log('Connecting to MongoDB...', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const visitsCount = await mongoose.connection.db.collection('visits').countDocuments();
  const appointmentsCount = await mongoose.connection.db.collection('appointments').countDocuments();

  console.log(`Visits count: ${visitsCount}`);
  console.log(`Appointments count: ${appointmentsCount}`);

  await mongoose.disconnect();
}

countRecords().catch(console.error);
