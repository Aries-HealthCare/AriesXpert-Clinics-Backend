#!/bin/bash

# AriesXpert VPS Deployment Assistant
# This script is intended to be run ON THE VPS after pulling the latest code.

echo "🚀 Starting AriesXpert Backend Update..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 2. Build the project
echo "🏗️  Building NestJS application..."
rm -rf dist
npm run build

# 3. Apply Migrations (if any)
# echo "🗄️  Running migrations..."
# npm run migrate

# 4. Restart with PM2
echo "🔄 Restarting PM2 process..."
if pm2 list | grep -q "ariesxpert-backend"; then
    pm2 restart ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env production
fi

# 5. Save PM2 list
pm2 save

echo "✅ Deployment Complete!"
echo "📡 Listening on Port: 3001"
echo "📜 Check logs with: pm2 logs ariesxpert-backend"
