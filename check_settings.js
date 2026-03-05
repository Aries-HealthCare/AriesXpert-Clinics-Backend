const { MongoClient } = require('mongodb');
(async () => {
    require('dotenv').config();
    const connUrl = process.env.MONGODB_URI || 'mongodb+srv://developer:AriesXpert11!%40%23@cluster0.z5i66.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(connUrl);
    await client.connect();
    const db = client.db();
    const settings = await db.collection('emailsettings').find().toArray();
    console.log("SETTINGS:", settings);
    const logs = await db.collection('emaillogs').find().sort({createdAt:-1}).limit(5).toArray();
    console.log("LOGS:", logs);
    process.exit(0);
})();
