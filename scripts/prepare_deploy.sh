#!/bin/bash
echo "🚀 Preparing for Production Deployment..."

# 1. Build
echo "📦 Building Application..."
npm install
npm run build

# 2. Check for .env.production
if [ -f .env.production ]; then
    echo "✅ .env.production found. Please ensure it contains: MONGODB_URI, RAZORPAY_WEBHOOK_SECRET, JWT_SECRET"
else
    echo "⚠️  .env.production missing! Creating template..."
    echo "MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/ariesxpert_v2?retryWrites=true&w=majority" > .env.production
    echo "PORT=3001" >> .env.production
    echo "JWT_SECRET=production_secret_key" >> .env.production
    echo "RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret" >> .env.production
    echo "📝 Created .env.production template. Please edit it."
fi

# 3. Docker Build (Optional)
if [ -f Dockerfile ]; then
    echo "🐳 Dockerfile found. To build Docker image:"
    echo "   docker build -t ariesxpert-backend-ts:prod ."
fi

echo "✅ Ready for Deployment."
echo "   Command to start: npm run start:prod"
