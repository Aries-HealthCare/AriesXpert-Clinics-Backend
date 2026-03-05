
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './src/modules/appointments/schemas/visit.schema';
import { VisitsService } from './src/modules/appointments/visits.service';
import { FinanceService } from './src/modules/finance/finance.service';
import { WalletService } from './src/modules/finance/wallet.service';
import { FinanceModule } from './src/modules/finance/finance.module';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Mock dependencies
const mockFinanceService = { generateInvoice: jest.fn() };
const mockWalletService = { recordTransaction: jest.fn() };

async function checkService() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(MONGODB_URI),
      MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
    ],
    providers: [
      VisitsService,
      { provide: FinanceService, useValue: mockFinanceService },
      { provide: WalletService, useValue: mockWalletService },
    ],
  }).compile();

  const visitsService = moduleRef.get<VisitsService>(VisitsService);
  
  try {
    const result = await visitsService.findAll({ limit: 5 });
    console.log(`Service found ${result.visits.length} visits out of total ${result.totalPages * 10} (approx)`);
    console.log('Sample visit ID:', result.visits[0]?._id);
    console.log('Sample visit status:', result.visits[0]?.status);
  } catch (e) {
    console.error('Error calling findAll:', e);
  }

  await moduleRef.close();
}

checkService().catch(console.error);
