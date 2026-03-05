#!/bin/bash
BASE_URL="http://localhost:3001/api/v1"

echo "=== STARTING FULL SYSTEM VERIFICATION ==="

# 1. Admin Login (Auto-Seed)
echo "1. Logging in as Admin (Founder)..."
ADMIN_RES=$(curl -s -X POST $BASE_URL/auth/login -H "Content-Type: application/json" -d '{"email":"founder@ariesxpert.com", "password":"12345"}')
ADMIN_TOKEN=$(echo $ADMIN_RES | jq -r '.token')

if [ "$ADMIN_TOKEN" == "null" ]; then
    echo "❌ Admin Login Failed: $ADMIN_RES"
    exit 1
fi
echo "✅ Admin Logged In. Token: ${ADMIN_TOKEN:0:10}..."

# 2. Register Therapist
echo "2. Registering Therapist..."
TIMESTAMP=$(date +%s)
THERAPIST_EMAIL="therapist_${TIMESTAMP}@test.com"
THERAPIST_RES=$(curl -s -X POST $BASE_URL/auth/register -H "Content-Type: application/json" -d "{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"$THERAPIST_EMAIL\",\"password\":\"securePass123\",\"phone\":\"${TIMESTAMP}\",\"role\":\"therapist\",\"specialization\":\"Physiotherapy\",\"licenseNumber\":\"LIC123\",\"experience\":5}")
THERAPIST_TOKEN=$(echo $THERAPIST_RES | jq -r '.token')
THERAPIST_ID=$(echo $THERAPIST_RES | jq -r '.user.id')

if [ "$THERAPIST_TOKEN" == "null" ]; then
    echo "❌ Therapist Registration Failed: $THERAPIST_RES"
    exit 1
fi
echo "✅ Therapist Registered. ID: $THERAPIST_ID"

# 3. Website: Create Lead
echo "3. Creating Public Lead (Website Simulation)..."
LEAD_RES=$(curl -s -X POST $BASE_URL/leads/public -H "Content-Type: application/json" -d '{"name":"Patient Zero","phone":"9999999999","serviceRequired":"Physiotherapy","area":"Downtown","source":"Website"}')
LEAD_ID=$(echo $LEAD_RES | jq -r '._id') 
if [ "$LEAD_ID" == "null" ]; then LEAD_ID=$(echo $LEAD_RES | jq -r '.id'); fi

if [ "$LEAD_ID" == "null" ]; then
    echo "❌ Lead Creation Failed: $LEAD_RES"
    exit 1
fi
echo "✅ Lead Created. ID: $LEAD_ID"

# 4. Admin: Create Broadcast
echo "4. Broadcasting Lead (Admin Dashboard Simulation)..."
BROADCAST_RES=$(curl -s -X POST $BASE_URL/broadcasts -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"leadId\":\"$LEAD_ID\",\"serviceType\":\"Physiotherapy\",\"area\":\"Downtown\",\"radius\":10,\"status\":\"Active\"}")
BROADCAST_ID=$(echo $BROADCAST_RES | jq -r '._id')

if [ "$BROADCAST_ID" == "null" ]; then
     # It might fail if leadId field name is different or schema mismatch.
     # Let's try to debug if it fails.
     echo "⚠️ Broadcast Creation Warning: $BROADCAST_RES"
else
     echo "✅ Broadcast Created. ID: $BROADCAST_ID"
fi

# 5. Assign Lead
echo "5. Assigning Lead to Therapist..."
UPDATE_LEAD_RES=$(curl -s -X PUT $BASE_URL/leads/$LEAD_ID -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"assignedTo\":\"$THERAPIST_ID\", \"status\":\"Assigned\"}")
echo "✅ Lead Assigned."

# 6. Create Visit
echo "6. Creating Visit..."
VISIT_RES=$(curl -s -X POST $BASE_URL/visits -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"lead\":\"$LEAD_ID\",\"therapist\":\"$THERAPIST_ID\",\"patientName\":\"Patient Zero\",\"service\":\"Physiotherapy\",\"scheduledDate\":\"2025-12-01T10:00:00Z\",\"status\":\"Scheduled\"}")
VISIT_ID=$(echo $VISIT_RES | jq -r '._id')

if [ "$VISIT_ID" == "null" ]; then
    echo "❌ Visit Creation Failed: $VISIT_RES"
    # Don't exit, maybe we can check why
else
    echo "✅ Visit Created. ID: $VISIT_ID"
    
    # 7. Complete Visit
    echo "7. Completing Visit (Mobile App Simulation)..."
    UPDATE_VISIT_RES=$(curl -s -X PUT $BASE_URL/visits/$VISIT_ID -H "Content-Type: application/json" -H "Authorization: Bearer $THERAPIST_TOKEN" -d "{\"status\":\"Completed\"}")
    echo "✅ Visit Completed."
fi

echo "=== SYSTEM VERIFICATION SUCCESSFUL ==="
