import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Country, State, City, SubArea, Area, Pincode } from '../src/modules/locations/schemas/location.schema';
import { Patient } from '../src/modules/patients/schemas/patient.schema';
import { Therapist } from '../src/modules/therapists/schemas/therapist.schema';

dotenv.config();

const INDIA_STATES = [
    { name: "Andhra Pradesh", code: "AP" },
    { name: "Arunachal Pradesh", code: "AR" },
    { name: "Assam", code: "AS" },
    { name: "Bihar", code: "BR" },
    { name: "Chhattisgarh", code: "CG" },
    { name: "Goa", code: "GA" },
    { name: "Gujarat", code: "GJ" },
    { name: "Haryana", code: "HR" },
    { name: "Himachal Pradesh", code: "HP" },
    { name: "Jharkhand", code: "JH" },
    { name: "Karnataka", code: "KA" },
    { name: "Kerala", code: "KL" },
    { name: "Madhya Pradesh", code: "MP" },
    { name: "Maharashtra", code: "MH" },
    { name: "Manipur", code: "MN" },
    { name: "Meghalaya", code: "ML" },
    { name: "Mizoram", code: "MZ" },
    { name: "Nagaland", code: "NL" },
    { name: "Odisha", code: "OR" },
    { name: "Punjab", code: "PB" },
    { name: "Rajasthan", code: "RJ" },
    { name: "Sikkim", code: "SK" },
    { name: "Tamil Nadu", code: "TN" },
    { name: "Telangana", code: "TG" },
    { name: "Tripura", code: "TR" },
    { name: "Uttar Pradesh", code: "UP" },
    { name: "Uttarakhand", code: "UK" },
    { name: "West Bengal", code: "WB" },
    { name: "Andaman and Nicobar Islands", code: "AN" },
    { name: "Chandigarh", code: "CH" },
    { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DN" },
    { name: "Lakshadweep", code: "LD" },
    { name: "Delhi", code: "DL" },
    { name: "Puducherry", code: "PY" },
    { name: "Jammu and Kashmir", code: "JK" },
    { name: "Ladakh", code: "LA" }
];

const FUZZY_STATE_MAP: { [key: string]: string } = {
    'maharshtra': 'Maharashtra',
    'maharastra': 'Maharashtra',
    'karnatka': 'Karnataka',
    'gujrat': 'Gujarat',
    'new delhi': 'Delhi'
};

const FUZZY_CITY_MAP: { [key: string]: string } = {
    'bangalore': 'Bengaluru',
    'bombay': 'Mumbai',
    'calcata': 'Kolkata',
    'calcautta': 'Kolkata',
    'delhi': 'New Delhi',
    'new delhi': 'New Delhi',
    'bengaluru': 'Bengaluru',
    'mumbai': 'Mumbai',
    'pune': 'Pune',
    'surat': 'Surat',
    'hyderabad': 'Hyderabad',
    'ahmedabad': 'Ahmedabad'
};

const CITY_STATE_INFERENCE: { [key: string]: string } = {
    'Mumbai': 'Maharashtra',
    'Pune': 'Maharashtra',
    'Bengaluru': 'Karnataka',
    'New Delhi': 'Delhi',
    'Kolkata': 'West Bengal',
    'Chennai': 'Tamil Nadu',
    'Hyderabad': 'Telangana',
    'Ahmedabad': 'Gujarat',
    'Surat': 'Gujarat',
    'Lucknow': 'Uttar Pradesh',
    'Kanpur': 'Uttar Pradesh',
    'Chandigarh': 'Chandigarh',
    'Patna': 'Bihar',
    'Bhopal': 'Madhya Pradesh',
    'Indore': 'Madhya Pradesh',
    'Jaipur': 'Rajasthan'
};

function formatName(name: string): string {
    if (!name) return '';
    name = name.trim().replace(/\s+/g, ' '); // remove extra spaces
    // Title Case
    return name.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB for Seeding & Migration...');

    const db = mongoose.connection.db;

    // 1. Create Base Country
    const countriesCollection = db.collection('countries');
    let india = await countriesCollection.findOne({ isoCode: 'IN' });
    if (!india) {
        const result = await countriesCollection.insertOne({
            name: 'India',
            isoCode: 'IN',
            active: true,
            currency: 'INR',
            currencySymbol: '₹',
            timezone: 'Asia/Kolkata',
            language: 'Hindi, English',
            taxType: 'GST',
            taxPercentage: 18
        });
        india = await countriesCollection.findOne({ _id: result.insertedId });
    }
    const indiaId = india!._id;

    // 2. Create Base States
    const statesCollection = db.collection('states');
    const stateIdMap = new Map<string, mongoose.Types.ObjectId>();

    for (const st of INDIA_STATES) {
        let stateRecord = await statesCollection.findOne({ name: st.name, countryId: indiaId });
        if (!stateRecord) {
            const result = await statesCollection.insertOne({
                name: st.name,
                stateCode: st.code,
                countryId: indiaId,
                active: true
            });
            stateIdMap.set(st.name, result.insertedId);
        } else {
            stateIdMap.set(st.name, stateRecord._id);
        }
    }

    // 3. Migrate & Normalize Existing Location Data from Patients/Therapists
    const patients = await db.collection('patients').find({}).toArray();
    const therapists = await db.collection('therapists').find({}).toArray();

    const citiesCollection = db.collection('cities');
    const subAreasCollection = db.collection('subareas');
    const areasCollection = db.collection('areas');
    const pincodesCollection = db.collection('pincodes');

    console.log(`Analyzing ${patients.length} patients and ${therapists.length} therapists...`);

    const extractAndResolve = async (cityRaw: string, stateRaw: string, pincodeRaw: string, areaRaw: string) => {
        if (!cityRaw && !stateRaw && !pincodeRaw) return;

        // Normalize
        let city = cityRaw ? formatName(cityRaw) : null;
        let state = stateRaw ? formatName(stateRaw) : null;
        let pincode = pincodeRaw ? String(pincodeRaw).trim() : null;
        let area = areaRaw ? formatName(areaRaw) : 'General Area';

        // Fuzzy matches
        if (state && FUZZY_STATE_MAP[state.toLowerCase()]) state = FUZZY_STATE_MAP[state.toLowerCase()];
        if (city && FUZZY_CITY_MAP[city.toLowerCase()]) city = FUZZY_CITY_MAP[city.toLowerCase()];

        // Infer state from city if missing
        if (city && !state && CITY_STATE_INFERENCE[city]) {
            state = CITY_STATE_INFERENCE[city];
        }

        // Infer city from state if state is 'Delhi' or 'Chandigarh'
        if (state === 'Delhi' && !city) city = 'New Delhi';
        if (state === 'Chandigarh' && !city) city = 'Chandigarh';

        if (!city || !state) return; // Needs both to create a valid hierarchy

        const stateId = stateIdMap.get(state);
        if (!stateId) return; // Unknown state

        // Upsert City
        let cityRecord = await citiesCollection.findOne({ name: city, stateId: stateId });
        if (!cityRecord) {
            const result = await citiesCollection.insertOne({ name: city, stateId: stateId, active: true });
            cityRecord = await citiesCollection.findOne({ _id: result.insertedId });
        }

        // Ensure a "Default SubArea" exists for the city to handle flat areas
        let subAreaRecord = await subAreasCollection.findOne({ name: 'Central Zone', cityId: cityRecord!._id });
        if (!subAreaRecord) {
            const result = await subAreasCollection.insertOne({ name: 'Central Zone', cityId: cityRecord!._id, active: true });
            subAreaRecord = await subAreasCollection.findOne({ _id: result.insertedId });
        }

        // Upsert Area
        let areaRecord = await areasCollection.findOne({ name: area, subAreaId: subAreaRecord!._id });
        if (!areaRecord) {
            const result = await areasCollection.insertOne({ name: area, subAreaId: subAreaRecord!._id, active: true });
            areaRecord = await areasCollection.findOne({ _id: result.insertedId });
        }

        // Map Pincode
        if (pincode) {
            let pinRecord = await pincodesCollection.findOne({ pincode: pincode, areaId: areaRecord!._id });
            if (!pinRecord) {
                await pincodesCollection.insertOne({ pincode: pincode, areaId: areaRecord!._id });
            }
        }
    };

    let processedCount = 0;

    for (const p of patients) {
        let city = p.city;
        let state = p.state || (p.address && p.address.state);
        let pincode = p.pincode;
        let area = p.address ? (typeof p.address === 'string' ? 'Locality' : p.address.line2 || 'Locality') : 'Locality';
        await extractAndResolve(city, state, pincode, area);
        processedCount++;
    }

    for (const t of therapists) {
        let city = t.location?.city || (t.areaOfServiceInfo && t.areaOfServiceInfo.city);
        let state = t.location?.state;
        let pincode = t.personalInfo?.address?.pincode;
        let area = 'Central Zone';
        if (t.areaOfServiceInfo && t.areaOfServiceInfo.areas && t.areaOfServiceInfo.areas.length > 0) {
            area = t.areaOfServiceInfo.areas[0];
        }
        await extractAndResolve(city, state, pincode, area);
        processedCount++;
    }

    console.log(`Processed ${processedCount} records and normalized relations.`);

    // Reporting
    const statesCount = await statesCollection.countDocuments();
    const citiesCount = await citiesCollection.countDocuments();
    const areasCount = await areasCollection.countDocuments();
    const pincodesCount = await pincodesCollection.countDocuments();

    console.log("\n====== MIGRATION AUDIT REPORT ======");
    console.log(`Total Countries: 1 (India)`);
    console.log(`Total States: ${statesCount} (100% India completed)`);
    console.log(`Total Cities: ${citiesCount}`);
    console.log(`Total Areas: ${areasCount}`);
    console.log(`Total Pincodes: ${pincodesCount}`);
    console.log("====================================");

    process.exit(0);
}

seed().catch(console.error);
