require('dotenv').config();
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
(async () => {
    // If we just POST to /clinic/staff, what error happens?
    const axios = require('axios');
    try {
        const login = await axios.post('http://localhost:5000/auth/login', {email: "akshaypatel@ariesxpert.com", password: "12345"});
        const token = login.data.token;
        const resp = await axios.post('http://localhost:5000/clinic/staff', {
            firstName: "Test",
            lastName: "Staff",
            email: "test.staff@ariesxpert.com",
            phone: "+919999999999"
        }, { headers: { Authorization: `Bearer ${token}` }});
        console.log("Response:", resp.status);
    } catch (e) {
        console.log("Error:", e.response?.data || e.message);
    }
})();
