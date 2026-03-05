const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'https://ariesxpert-backend.onrender.com/api/v1';

async function runAudit() {
    console.log('🔍 Starting AriesXpert Production Audit...\n');

    // 1. Version Check
    try {
        console.log('1️⃣  Checking Backend Version...');
        const vRes = await axios.get(`${BASE_URL}/version`);
        console.log('   ✅ Backend Active:', vRes.data);
    } catch (e) {
        console.log('   ❌ Version Check Failed:', e.response ? e.response.data : e.message);
    }

    // 2. Onboarding Integration Test (Real Write)
    try {
        console.log('\n2️⃣  Testing Therapist Onboarding (Real Transaction)...');
        const form = new FormData();
        const email = "audit_therapist_" + Date.now() + "@aries.com";
        const phone = "+91" + Math.floor(1000000000 + Math.random() * 9000000000);

        const payload = {
            personalDetails: { fullName: "Audit Bot", email, mobileNumber: phone, gender: "Male", dob: "1990-01-01" },
            professionalDetails: { role: "physiotherapy", qualification: "BPT", specializations: ["Ortho"], licenseNumber: "AUDIT-" + Date.now(), authorityName: "IAP", experience: "5" },
            bankingDetails: { accountType: "Savings", businessName: "", fields: { accountNumber: "1234567890", ifsc: "HDFC0001234" } },
            serviceArea: { address: "Mumbai", pincodes: ["400001"] }
        };

        form.append('personalDetails', JSON.stringify(payload.personalDetails));
        form.append('professionalDetails', JSON.stringify(payload.professionalDetails));
        form.append('bankingDetails', JSON.stringify(payload.bankingDetails));
        form.append('serviceArea', JSON.stringify(payload.serviceArea));

        const obRes = await axios.post(`${BASE_URL}/therapists/onboard`, form, { headers: { ...form.getHeaders() } });
        
        if (obRes.data.success) {
            console.log('   ✅ Onboarding Success');
            console.log('   🆔 User ID:', obRes.data.data.user.id);
            console.log('   🔑 Token:', obRes.data.data.token ? 'Generated' : 'Missing');
        } else {
            console.log('   ❌ Onboarding Failed:', obRes.data);
        }
    } catch (e) {
        console.log('   ❌ Onboarding Error:', e.response ? e.response.data : e.message);
    }

    console.log('\n🏁 Audit Complete. Please review results above.');
}

runAudit();
