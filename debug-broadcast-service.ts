
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Broadcast, BroadcastSchema } from './src/modules/broadcasts/schemas/broadcast.schema';
import { BroadcastListing, BroadcastListingSchema } from './src/modules/broadcasts/schemas/broadcast-listing.schema';
import { BroadcastsService } from './src/modules/broadcasts/broadcasts.service';
import { Lead, LeadSchema } from './src/modules/leads/schemas/lead.schema';
import { Patient, PatientSchema } from './src/modules/patients/schemas/patient.schema';
import { Therapist, TherapistSchema } from './src/modules/therapists/schemas/therapist.schema';
import { Visit, VisitSchema } from './src/modules/appointments/schemas/visit.schema';
import { WhatsAppService } from './src/modules/whatsapp/services/whatsapp.service';
import { AiService } from './src/modules/ai/ai.service';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Mock dependencies
const mockWhatsAppService = {};
const mockAiService = {};

async function debugService() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(MONGODB_URI),
      MongooseModule.forFeature([
        { name: Broadcast.name, schema: BroadcastSchema },
        { name: BroadcastListing.name, schema: BroadcastListingSchema },
        { name: Lead.name, schema: LeadSchema },
        { name: Patient.name, schema: PatientSchema },
        { name: Therapist.name, schema: TherapistSchema },
        { name: Visit.name, schema: VisitSchema },
      ]),
    ],
    providers: [
      BroadcastsService,
      { provide: WhatsAppService, useValue: mockWhatsAppService },
      { provide: AiService, useValue: mockAiService },
    ],
  }).compile();

  const service = moduleRef.get<BroadcastsService>(BroadcastsService);
  const broadcastModel = moduleRef.get(getModelToken(Broadcast.name));
  
  // 1. Check specific ID from broadcastlistings sample
  const specificId = "67d70ca9b9b5c5e81c66582e";
  console.log(`Checking specific ID: ${specificId}`);
  try {
      const result = await service.getBroadcastById(specificId);
      console.log('Service Result for Specific ID:', JSON.stringify(result, null, 2));
  } catch (e) {
      console.error('Service Error for Specific ID:', e);
  }

  /*
  const specific = await broadcastModel.findById(specificId).lean();
  console.log('Found in DB?', !!specific);
  if (specific) console.log(JSON.stringify(specific, null, 2));
  */
  
  return; 

  // 2. Find a valid ID
  const sample = await broadcastModel.findOne({}).lean();
  if (!sample) {
      console.log('No broadcasts found in DB');
      return;
  }
  
  const id = sample._id.toString();
  console.log(`Testing with Broadcast ID: ${id}`);

  try {
      const result = await service.getBroadcastById(id);
      console.log('Service Result:', JSON.stringify(result, null, 2));
  } catch (e) {
      console.error('Service Error:', e);
  }

  await moduleRef.close();
}

debugService().catch(console.error);
