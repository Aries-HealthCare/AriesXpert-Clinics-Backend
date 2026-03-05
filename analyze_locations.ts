import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Country, State, City, Area } from './src/modules/locations/schemas/location.schema';
import { Patient } from './src/modules/patients/schemas/patient.schema';
import { Therapist } from './src/modules/therapists/schemas/therapist.schema';

async function bootstrap() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ariesxpert');
    console.log("Connected to DB");
    const db = mongoose.connection;
    const stats: any = {};
    for (const collection of Object.keys(db.collections)) {
        stats[collection] = await db.collections[collection].countDocuments();
    }
    console.log("Collection counts:", stats);
    process.exit(0);
}
bootstrap();
