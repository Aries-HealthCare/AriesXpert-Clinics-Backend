const axios = require('axios');
const FormData = require('form-data');

async function verifyOnboarding() {
    const form = new FormData();

    const email = "real_therapist_" + Date.now() + "@aries.com";
    const phone = "+91" + Math.floor(1000000000 + Math.random() * 9000000000);

    const personalDetails = {
        fullName: "Real Therapist Production",
        email: email,
        mobileNumber: phone,
        gender: "Male",
        dob: "1990-01-01"
    };

    const professionalDetails = {
        role: "physiotherapy",
        qualification: "BPT",
        specializations: ["Ortho"],
        licenseNumber: "LIC-" + Date.now(),
        authorityName: "IAP",
        experience: "5",
        hasOwnClinic: false,
        clinicName: "",
        clinicEstablishmentYear: "",
        professionalDocuments: []
    };

    const bankingDetails = {
        accountType: "Savings",
        businessName: "",
        fields: { accountNumber: "1234567890", ifsc: "HDFC0001234" }
    };

    const serviceArea = {
        address: "Mumbai, India",
        latitude: 19.0760,
        longitude: 72.8777,
        radiusKm: 10,
        pincodes: ["400001"],
        commuteMode: "Bike",
        maxDistancePerVisit: 20,
        acceptEmergency: true,
        acceptLateEvening: false
    };

    form.append('personalDetails', JSON.stringify(personalDetails));
    form.append('professionalDetails', JSON.stringify(professionalDetails));
    form.append('bankingDetails', JSON.stringify(bankingDetails));
    form.append('serviceArea', JSON.stringify(serviceArea));

    try {
        console.log('🚀 Sending REAL onboarding request...');
        console.log(`   Email: ${email}`);
        
        const response = await axios.post('https://ariesxpert-backend.onrender.com/api/v1/therapists/onboard', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('✅ Response Status:', response.status);
        
        if (response.data.success) {
            console.log('✅ Onboarding Successful');
            console.log('   User ID:', response.data.data.user.id);
            console.log('   Token:', response.data.data.token ? 'Received' : 'Missing');
            console.log('   Therapist Profile:', response.data.data.user.therapistProfile ? 'Created' : 'Missing');
        } else {
            console.log('❌ Onboarding Failed:', response.data.message);
        }

    } catch (error) {
        console.error('❌ Request Error:', error.response ? error.response.data : error.message);
    }
}

verifyOnboarding();
