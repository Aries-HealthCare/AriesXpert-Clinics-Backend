const { MongoClient } = require('mongodb');
(async () => {
    const connUrl = 'mongodb+srv://arieshealthcare:Aries%40786@ariesxpert.x8ndzni.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=ariesxpert';
    const client = new MongoClient(connUrl);
    await client.connect();
    const db = client.db();
    const settings = await db.collection('emailsettings').find().toArray();
    console.log("SETTINGS:", settings);
    const logs = await db.collection('emaillogs').find().sort({createdAt:-1}).limit(5).toArray();
    console.log("LOGS:", logs);
    process.exit(0);
})();
