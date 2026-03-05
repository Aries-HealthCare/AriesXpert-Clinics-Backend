const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function seed() {
    const uri = "mongodb+srv://arieshealthcare:Aries%40786@ariesxpert.x8ndzni.mongodb.net/ariesxpert?retryWrites=true&w=majority&appName=ariesxpert";

    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const users = db.collection('users');

        const email = "akshaypatel@ariesxpert.com";
        const existing = await users.findOne({ email });

        if (existing) {
            const salt = await bcrypt.genSalt(12);
            const password = await bcrypt.hash("123456", salt);
            await users.updateOne({ email }, { $set: { password, role: "founder", isActive: true, isVerified: true } });
            console.log(`Updated ${email} password to 123456 and role to founder!`);
        } else {
            const salt = await bcrypt.genSalt(12);
            const password = await bcrypt.hash("123456", salt);
            const rand = Math.floor(Math.random() * 10000000000);
            await users.insertOne({
                firstName: "Akshay",
                lastName: "Patel",
                email: email,
                phone: `+91${rand}`,
                password: password,
                role: "founder",
                isActive: true,
                isVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`Created ${email} with password 123456!`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
