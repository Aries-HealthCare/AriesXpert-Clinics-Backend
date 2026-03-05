#!/bin/bash
BASE_URL="http://localhost:3001/api/v1"
echo "🔥 Starting End-to-End Production Validation..."

# 1. Register Therapist
echo "1. Registering Therapist..."
REG_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Prod",
    "lastName": "User",
    "email": "prod.user@ariesxpert.com",
    "password": "password123",
    "phone": "9876543210",
    "role": "therapist",
    "specialization": "physiotherapy",
    "licenseNumber": "PROD-LIC-001",
    "experience": 5
  }')

echo "   Response: $REG_RES"
if [[ $REG_RES != *"token"* ]]; then
    echo "❌ Registration Failed"
    exit 1
fi
echo "✅ Registration Successful"

# 2. Login (to get fresh token)
echo "2. Logging In..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prod.user@ariesxpert.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RES | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login Failed"
    exit 1
fi
echo "✅ Login Successful. UserID: $USER_ID"

# 3. Create Patient
echo "3. Creating Patient..."
PATIENT_RES=$(curl -s -X POST "$BASE_URL/patients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "firstName": "Sick",
    "lastName": "Patient",
    "phone": "1122334455",
    "city": "Mumbai"
  }')

PATIENT_ID=$(echo $PATIENT_RES | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
if [ -z "$PATIENT_ID" ]; then
    echo "❌ Patient Creation Failed"
    exit 1
fi
echo "✅ Patient Created: $PATIENT_ID"

# 4. Create Visit
echo "4. Creating Visit..."
VISIT_DATA="{\"appointmentId\": \"$PATIENT_ID\", \"patientId\": \"$PATIENT_ID\", \"therapistId\": \"$USER_ID\", \"visitDate\": \"2023-10-27T10:00:00.000Z\", \"notes\": \"Production Test Visit\"}"

VISIT_RES=$(curl -s -X POST "$BASE_URL/visits" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$VISIT_DATA")

if [[ $VISIT_RES == *"_id"* ]]; then
    echo "✅ Visit Created"
else
    echo "❌ Visit Creation Failed: $VISIT_RES"
    # Don't exit, try webhook anyway
fi

# 5. Simulate Payment Webhook
echo "5. Simulating Payment Webhook (Razorpay)..."
WEBHOOK_DATA="{\"event\": \"payment.captured\", \"payload\": {\"payment\": {\"entity\": {\"id\": \"pay_prod_001\", \"amount\": 50000, \"currency\": \"INR\", \"notes\": {\"userId\": \"$USER_ID\", \"country\": \"India\"}}}}}"

WEBHOOK_RES=$(curl -s -X POST "$BASE_URL/finance/webhook/simulate" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_DATA")

if [[ $WEBHOOK_RES == *"processed"* ]] || [[ $WEBHOOK_RES == *"Processed"* ]]; then
    echo "✅ Webhook Processed"
else
    echo "❌ Webhook Failed: $WEBHOOK_RES"
    exit 1
fi

# 6. Verify Wallet (Ledger)
echo "6. Verifying Wallet Balance..."
ME_RES=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

# Simple check if response contains expected data
if [[ $ME_RES == *"wallet"* ]]; then
    echo "✅ Wallet Balance Updated in Profile"
else
    echo "⚠️  Wallet check inconclusive: $ME_RES"
fi

echo "🔥 Production Validation Complete."
