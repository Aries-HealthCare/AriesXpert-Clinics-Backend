const { MongoClient } = require('mongodb');
require('dotenv').config();
(async () => {
    const connUrl = process.env.MONGODB_URI || 'mongodb+srv://developer:AriesXpert11!%40%23@cluster0.z5i66.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(connUrl);
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({ role: { $in: ['receptionist', 'clinic_admin', 'physiotherapist', 'accounts_manager'] } }).toArray();
    console.log("Found clinic users:", users.map(u => ({ id: u._id, email: u.email, role: u.role, clinicId: u.clinicId })));
    const logs = await db.collection('emaillogs').find().toArray();
    console.log("Email logs length:", logs.length);
    if(logs.length > 0) console.log("Recent log error:", logs[logs.length-1].error_message);
    process.exit(0);
})();
