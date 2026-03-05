#!/bin/bash

# AriesXpert Backend - Production Deployment Script
# This script commits and pushes changes to trigger Render deployment

set -e

echo "🚀 AriesXpert Backend - Production Deployment"
echo "=============================================="
echo ""

# Check if on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo "⚠️  Warning: You're not on main/master branch!"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Step 1: Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""

echo "📝 Step 2: Staging changes..."
git add .

echo ""
echo "💬 Step 3: Committing changes..."
read -p "Enter commit message (default: 'Production deployment $(date +'%Y-%m-%d %H:%M')'): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Production deployment $(date +'%Y-%m-%d %H:%M')"}

git commit -m "$COMMIT_MSG" || echo "No changes to commit"

echo ""
echo "🔍 Step 4: Checking git status..."
git status

echo ""
read -p "Push to production? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Step 5: Pushing to GitHub..."
git push origin $CURRENT_BRANCH

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "🔄 Render will automatically deploy from GitHub"
echo "📊 Monitor deployment at: https://dashboard.render.com"
echo ""
echo "Backend URL: https://ariesxpert-backend.onrender.com/api/v1"
echo ""
echo "✨ Deployment initiated successfully!"
