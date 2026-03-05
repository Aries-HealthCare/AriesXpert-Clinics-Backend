#!/bin/bash
BASE_URL="http://localhost:3001/api/v1"
echo "🔥 Starting Frontend Flow Simulation & Webhook Verification..."

# 1. Simulate "Lead Generation" (Frontend: Website -> API)
echo "---------------------------------------------------"
echo "1. 🌐 Frontend Simulation: User submits Lead form on Website"
LEAD_PAYLOAD='{
  "fullName": "Frontend Sim User",
  "phone": "5550001234",
  "email": "frontend.sim@ariesxpert.com",
  "service": "Physiotherapy",
  "city": "Mumbai",
  "leadType": "patient-appointment"
}'
echo "   Payload: $LEAD_PAYLOAD"
LEAD_RES=$(curl -s -X POST "$BASE_URL/leads/public" \
  -H "Content-Type: application/json" \
  -d "$LEAD_PAYLOAD")

echo "   Response: $LEAD_RES"
if [[ $LEAD_RES == *"_id"* ]]; then
    echo "✅ Lead Submitted Successfully (Simulated Website Action)"
else
    echo "❌ Lead Submission Failed"
    exit 1
fi

# 2. Simulate "Registration" (Frontend: Admin/App -> API)
echo "---------------------------------------------------"
echo "2. 📱 Frontend Simulation: Therapist Registration"
REG_PAYLOAD='{
  "firstName": "Real",
  "lastName": "Therapist",
  "email": "real.therapist@ariesxpert.com",
  "password": "securePass123!",
  "phone": "9988776655",
  "role": "therapist",
  "specialization": "physiotherapy",
  "licenseNumber": "REAL-LIC-999",
  "experience": 8
}'
REG_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REG_PAYLOAD")

if [[ $REG_RES == *"token"* ]]; then
    echo "✅ Registration Successful"
else
    # If already exists, try login
    echo "⚠️  User might exist, trying login..."
fi

# 3. Login
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "real.therapist@ariesxpert.com",
    "password": "securePass123!"
  }')

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RES | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login Failed"
    exit 1
fi
echo "✅ Login Successful. UserID: $USER_ID"

# 4. Simulate Payment Gateway Webhook (Razorpay)
echo "---------------------------------------------------"
echo "3. 💳 Webhook Simulation: Razorpay 'payment.captured'"
echo "   - Scenario: Payment Success with Signature"

WEBHOOK_BODY='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_real_signature_001","amount":75000,"currency":"INR","notes":{"userId":"'"$USER_ID"'","country":"India"}}}}}'

# Generate HMAC SHA256 Signature using Node.js one-liner
# Secret: test_secret (Default in controller)
SIGNATURE=$(node -e "console.log(require('crypto').createHmac('sha256', 'test_secret').update('$WEBHOOK_BODY').digest('hex'))")

echo "   Generated Signature: $SIGNATURE"

WEBHOOK_RES=$(curl -s -X POST "$BASE_URL/finance/webhook/simulate" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIGNATURE" \
  -d "$WEBHOOK_BODY")

echo "   Response: $WEBHOOK_RES"

if [[ $WEBHOOK_RES == *"Processed"* ]] || [[ $WEBHOOK_RES == *"processed"* ]]; then
    echo "✅ Webhook Verified & Processed"
else
    echo "❌ Webhook Failed"
    exit 1
fi

# 5. Simulate Duplicate Webhook (Idempotency Check)
echo "---------------------------------------------------"
echo "4. 🔄 Idempotency Check: Sending Duplicate Webhook"
WEBHOOK_RES_DUP=$(curl -s -X POST "$BASE_URL/finance/webhook/simulate" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: $SIGNATURE" \
  -d "$WEBHOOK_BODY")

echo "   Response: $WEBHOOK_RES_DUP"

if [[ $WEBHOOK_RES_DUP == *"Already Processed"* ]]; then
    echo "✅ Idempotency Verified (Duplicate Skipped)"
else
    echo "❌ Idempotency Failed (Or processed again)"
    exit 1
fi

echo "---------------------------------------------------"
echo "🔥 System Ready for Go-Live."
