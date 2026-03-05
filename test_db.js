const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb+srv://arieshealthcarev2:gN5P9Q9g659dC@cluster0.db82k.mongodb.net/ariesv2?retryWrites=true&w=majority', {
      serverSelectionTimeoutMS: 5000
    });
    console.log("Connected");
    const Therapist = mongoose.connection.collection('therapists');
    const user = await Therapist.findOne({ phone: "+919372681410" });
    if (!user) {
        const user2 = await Therapist.findOne({ phone: "9372681410" });
        console.log("No +91 user, trying without:", user2);
    } else {
        console.log(JSON.stringify(user, null, 2));
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
