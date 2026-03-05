#!/bin/bash
BASE_URL="http://localhost:3001/api/v1"
echo "🔥 Starting Smoke Test for NestJS Backend..."

# 1. Create Lead (Public)
echo "1. Creating Public Lead..."
curl -s -X POST "$BASE_URL/leads/public" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "NestJS User",
    "phone": "9999988888",
    "email": "nestjs@test.com",
    "service": "Physiotherapy",
    "city": "Mumbai"
  }' | grep "success" && echo "✅ Lead Created" || echo "❌ Lead Creation Failed"

# 2. Finance - Record Payment (Mock)
echo "2. Recording Payment..."
curl -s -X POST "$BASE_URL/finance/record-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "therapist_123",
    "amount": 1000,
    "type": "CASH",
    "country": "India",
    "referenceId": "txn_test_001"
  }' | grep "success" && echo "✅ Payment Recorded" || echo "❌ Payment Failed"

# 3. List Visits (Empty is fine, just checking 200 OK)
echo "3. Fetching Visits..."
curl -s -X GET "$BASE_URL/visits?therapistId=t1" | grep "visits" && echo "✅ Visits API Working" || echo "❌ Visits API Failed"

echo "🔥 Smoke Test Complete."
