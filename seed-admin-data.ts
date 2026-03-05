
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ariesxpert-admin:AriesXpert2024!@ariesxpert-cluster.mongodb.net/ariesxpert?retryWrites=true&w=majority';

async function seed() {
  console.log('Connecting to MongoDB...', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // 1. Create Therapist (User)
  const therapistId = new mongoose.Types.ObjectId();
  const therapist = {
    _id: therapistId,
    firstName: 'Sarah',
    lastName: 'Smith',
    email: 'sarah.smith@ariesxpert.com',
    phone: '+919876543210',
    role: 'therapist',
    specialization: 'Physiotherapy',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('users').updateOne(
    { email: therapist.email },
    { $set: therapist },
    { upsert: true }
  );
  console.log('Seeded Therapist');

  // 2. Create Patients
  const patient1Id = new mongoose.Types.ObjectId();
  const patient1 = {
    _id: patient1Id,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+919876500001',
    email: 'john.doe@example.com',
    city: 'Mumbai',
    gender: 'Male',
    age: 45,
    status: 'Active',
    condition: 'Chronic Back Pain',
    medicalConditions: ['Chronic Back Pain', 'Hypertension'],
    assignedTherapist: therapistId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const patient2Id = new mongoose.Types.ObjectId();
  const patient2 = {
    _id: patient2Id,
    firstName: 'Jane',
    lastName: 'Roe',
    phone: '+919876500002',
    email: 'jane.roe@example.com',
    city: 'Delhi',
    gender: 'Female',
    age: 32,
    status: 'Pending',
    condition: 'Post-Op Recovery',
    medicalConditions: ['ACL Surgery Recovery'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('patients').updateOne({ email: patient1.email }, { $set: patient1 }, { upsert: true });
  await db.collection('patients').updateOne({ email: patient2.email }, { $set: patient2 }, { upsert: true });
  console.log('Seeded Patients');

  // 3. Create Treatments
  const treatment1 = {
    patient: patient1Id,
    expert: therapistId,
    treatmentName: 'Back Pain Relief Program',
    status: 'Active',
    startDate: new Date(),
    sessions: 10,
    progress: 20,
    isActive: true,
    paymentStatus: 'Paid',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('treatments').insertOne(treatment1);
  console.log('Seeded Treatments');

  // 4. Create Visits (Appointments)
  const visit1 = {
    patientId: patient1Id,
    patient: patient1Id, // Legacy support
    therapistId: therapistId,
    therapist: therapistId, // Legacy support
    expert: therapistId,
    visitDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
    scheduledAt: new Date(new Date().setDate(new Date().getDate() + 1)),
    status: 'scheduled',
    appointmentStatus: 'scheduled',
    type: 'home_visit',
    amountDue: 500,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const visit2 = {
    patientId: patient2Id,
    patient: patient2Id,
    therapistId: therapistId,
    therapist: therapistId,
    expert: therapistId,
    visitDate: new Date(), // Today
    scheduledAt: new Date(),
    status: 'completed',
    appointmentStatus: 'completed',
    type: 'telehealth',
    meetUrl: 'https://meet.google.com/abc-defg-hij',
    amountDue: 800,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('visits').insertMany([visit1, visit2]);
  console.log('Seeded Visits');

  // 5. Create Broadcasts
  const broadcast1 = {
    patientName: 'Rahul Gupta',
    medicalConcern: 'Knee Pain',
    serviceType: 'Home Visit',
    location: { city: 'Pune', area: 'Kothrud' },
    city: 'Pune',
    startTime: new Date(),
    status: 'Active',
    interestedTherapists: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const broadcast2 = {
    patientName: 'Anita Singh',
    medicalConcern: 'Neck Stiffness',
    serviceType: 'Telehealth',
    location: { city: 'Mumbai', area: 'Bandra' },
    city: 'Mumbai',
    startTime: new Date(),
    status: 'Closed',
    interestedTherapists: [therapistId],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('broadcasts').insertMany([broadcast1, broadcast2]);
  console.log('Seeded Broadcasts');

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(console.error);
