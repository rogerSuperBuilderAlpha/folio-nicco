#!/bin/bash

# Firebase Functions Deployment Script for Thumbnail Generation

echo "🚀 Starting Firebase Functions deployment..."

# Check if we're in the functions directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the functions directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix TypeScript errors."
    exit 1
fi

# Deploy functions
echo "☁️ Deploying to Firebase..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎯 Functions deployed:"
    echo "  - generateVideoThumbnail (HTTPS callable)"
    echo "  - healthCheck (HTTP endpoint)"
    echo ""
    echo "💡 Test your function:"
    echo "  firebase functions:shell"
    echo ""
else
    echo "❌ Deployment failed!"
    exit 1
fi
