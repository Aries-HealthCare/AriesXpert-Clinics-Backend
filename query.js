const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://arieshealthcarev2:gN5P9Q9g659dC@cluster0.db82k.mongodb.net/ariesv2?retryWrites=true&w=majority');
  
  const Therapist = mongoose.connection.collection('therapists');
  const user = await Therapist.findOne({ phone: "+919372681410" });
  
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}

run();
