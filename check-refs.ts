
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './src/modules/appointments/schemas/visit.schema';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkReferences() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(MONGODB_URI),
      MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
    ],
  }).compile();

  const visitModel = moduleRef.get(getModelToken(Visit.name));
  const connection = moduleRef.get(getConnectionToken());
  
  const sample = await visitModel.findOne({ isDeleted: false }).lean();
  if (sample) {
    console.log('Sample Visit ID:', sample._id);
    console.log('Therapist ID:', sample.therapist);
    
    // Check "therapist" collection (singular)
    const therapistSingularCount = await connection.db.collection('therapist').countDocuments({ _id: sample.therapist });
    console.log('Therapist found in "therapist" collection:', therapistSingularCount > 0);
  }

  await moduleRef.close();
}

checkReferences().catch(console.error);
