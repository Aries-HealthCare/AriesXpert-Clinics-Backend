
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './src/modules/appointments/schemas/visit.schema';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkModel() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(MONGODB_URI),
      MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
    ],
  }).compile();

  const visitModel = moduleRef.get(getModelToken(Visit.name));
  console.log('Model collection name:', visitModel.collection.name);
  
  const count = await visitModel.countDocuments();
  console.log('Total document count via model:', count);

  const filter: any = { 
    $or: [
      { isDeleted: false }, 
      { isDeleted: { $exists: false } }
    ]
  };
  const filteredCount = await visitModel.countDocuments(filter);
  console.log('Filtered document count (isDeleted: false):', filteredCount);

  // Check a sample
  const sample = await visitModel.findOne(filter).lean();
  console.log('Sample visit:', sample ? JSON.stringify(sample, null, 2) : 'None');

  await moduleRef.close();
}

checkModel().catch(console.error);
