const { MongoClient } = require('mongodb');
require('dotenv').config();
(async () => {
    const connUrl = process.env.MONGODB_URI || 'mongodb+srv://developer:AriesXpert11!%40%23@cluster0.z5i66.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(connUrl);
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find().sort({createdAt: -1}).limit(5).toArray();
    console.log("Recently created users:", users.map(u => ({ email: u.email, role: u.role, isVerified: u.isVerified, clinicId: u.clinicId })));
    process.exit(0);
})();
