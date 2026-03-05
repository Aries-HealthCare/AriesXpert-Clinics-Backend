#!/bin/bash
BASE_URL="http://localhost:3001/api/v1"
echo "🔥 Starting Extended Smoke Test for NestJS Backend..."

# 1. Login (Mock)
echo "1. Logging in (Mock)..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@ariesxpert.com",
    "password": "12345"
  }')

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed! Response: $LOGIN_RES"
    exit 1
fi
echo "✅ Login Successful. Token: ${TOKEN:0:15}..."

# 2. Create Lead (Public)
echo "2. Creating Public Lead..."
curl -s -X POST "$BASE_URL/leads/public" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "NestJS User",
    "phone": "9999988888",
    "email": "nestjs@test.com",
    "service": "Physiotherapy",
    "city": "Mumbai"
  }' | grep "success" && echo "✅ Lead Created" || echo "❌ Lead Creation Failed"

# 3. Create Patient (Protected)
echo "3. Creating Patient (Protected)..."
curl -s -X POST "$BASE_URL/patients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890",
    "city": "Bangalore"
  }' | grep "firstName" && echo "✅ Patient Created" || echo "❌ Patient Creation Failed"

# 4. Search Therapists (Public/Private)
echo "4. Searching Therapists..."
curl -s -X GET "$BASE_URL/therapists/search?city=Bangalore" | grep "[]" && echo "✅ Therapist Search Working" || echo "❌ Therapist Search Failed"

echo "🔥 Extended Smoke Test Complete."
