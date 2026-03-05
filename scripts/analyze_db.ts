import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function analyze() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const collections = await mongoose.connection.db.collections();
    const report: any = {};

    for (const collection of collections) {
        const name = collection.collectionName;
        if (['countries', 'states', 'cities', 'sub_areas', 'areas', 'pincodes', 'patients', 'therapists', 'users'].includes(name)) {
            const count = await collection.countDocuments();
            report[name] = count;
        }
    }

    console.log("Collection counts:", report);
    process.exit(0);
}
analyze();
