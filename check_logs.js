const { MongoClient } = require('mongodb');
(async () => {
    const uri = 'mongodb+srv://developer:AriesXpert11!%40%23@cluster0.z5i66.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=Cluster0'; // using default hardcoded uri if it's there
    // Or just grab it from .env
    require('dotenv').config();
    const connUrl = process.env.MONGODB_URI || uri;
    const client = new MongoClient(connUrl);
    await client.connect();
    const db = client.db();
    const logs = await db.collection('emaillogs').find().sort({createdAt: -1}).limit(5).toArray();
    console.log("RECENT EMAIL LOGS:");
    console.dir(logs, {depth: null});
    process.exit(0);
})();
