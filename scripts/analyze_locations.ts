import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

async function analyzeLocations() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const db = mongoose.connection.db;

    // We will analyze patients, and therapists (the main users of location data)
    const patients = await db.collection('patients').find({}).toArray();
    const therapists = await db.collection('therapists').find({}).toArray();

    const report = {
        totalPatients: patients.length,
        totalTherapists: therapists.length,
        patientsWithMissingCity: 0,
        patientsWithMissingState: 0,
        patientsWithMissingPincode: 0,
        therapistsWithMissingCity: 0,
        therapistsWithMissingState: 0,
        therapistsWithMissingPincode: 0,
        uniquePatientCities: new Set<string>(),
        uniquePatientStates: new Set<string>(),
        uniquePatientPincodes: new Set<string>(),
        uniqueTherapistCities: new Set<string>(),
        uniqueTherapistStates: new Set<string>(),
        uniqueTherapistPincodes: new Set<string>(),
        inconsistentStates: new Map<string, string[]>(), // city -> [states]
        duplicateCities: new Set<string>(),
        orphanPincodes: new Set<string>() // pincodes without city
    };

    patients.forEach(p => {
        let city = p.city ? p.city.trim().toLowerCase() : null;
        let state = p.state ? p.state.trim().toLowerCase() : p.address?.state ? p.address.state.trim().toLowerCase() : null;
        let pincode = p.pincode ? String(p.pincode).trim() : null;

        if (!city) report.patientsWithMissingCity++;
        else report.uniquePatientCities.add(city);

        if (!state) report.patientsWithMissingState++;
        else report.uniquePatientStates.add(state);

        if (!pincode) report.patientsWithMissingPincode++;
        else report.uniquePatientPincodes.add(pincode);

        if (city && state) {
            if (!report.inconsistentStates.has(city)) {
                report.inconsistentStates.set(city, [state]);
            } else {
                const states = report.inconsistentStates.get(city)!;
                if (!states.includes(state)) states.push(state);
            }
        }
    });

    therapists.forEach(t => {
        let city = t.location?.city ? t.location.city.trim().toLowerCase() : t.areaOfServiceInfo?.city ? t.areaOfServiceInfo.city.trim().toLowerCase() : null;
        let state = t.location?.state ? t.location.state.trim().toLowerCase() : null;
        let pincode = t.personalInfo?.address?.pincode ? String(t.personalInfo.address.pincode).trim() : null;

        if (!city) report.therapistsWithMissingCity++;
        else report.uniqueTherapistCities.add(city);

        if (!state) report.therapistsWithMissingState++;
        else report.uniqueTherapistStates.add(state);

        if (!pincode) report.therapistsWithMissingPincode++;
        else report.uniqueTherapistPincodes.add(pincode);

        if (city && state) {
            if (!report.inconsistentStates.has(city)) {
                report.inconsistentStates.set(city, [state]);
            } else {
                const states = report.inconsistentStates.get(city)!;
                if (!states.includes(state)) states.push(state);
            }
        }
    });

    const finalReport = {
        ...report,
        uniquePatientCities: Array.from(report.uniquePatientCities),
        uniquePatientStates: Array.from(report.uniquePatientStates),
        uniquePatientPincodes: Array.from(report.uniquePatientPincodes),
        uniqueTherapistCities: Array.from(report.uniqueTherapistCities),
        uniqueTherapistStates: Array.from(report.uniqueTherapistStates),
        uniqueTherapistPincodes: Array.from(report.uniqueTherapistPincodes),
        inconsistentStates: Array.from(report.inconsistentStates.entries())
            .filter(([city, states]) => 'states'.length > 1)
            .map(([city, states]) => ({ city, states }))
    };

    fs.writeFileSync('location_audit_report.json', JSON.stringify(finalReport, null, 2));
    console.log('Report saved to location_audit_report.json');

    // Also let's check what areas the `areas` collection has
    const areas = await db.collection('areas').find({}).toArray();
    console.log("Existing areas count:", areas.length);

    process.exit(0);
}

analyzeLocations().catch(console.error);
