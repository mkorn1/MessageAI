#!/bin/bash

# Deploy Firestore indexes to fix chat loading issue
echo "🚀 Deploying Firestore indexes..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Deploy indexes
echo "📡 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ Firestore indexes deployed successfully!"
    echo "📝 The chat loading issue should now be resolved."
    echo "⏳ Note: Index creation may take a few minutes to complete."
else
    echo "❌ Failed to deploy Firestore indexes."
    echo "💡 You can also deploy them manually from the Firebase Console:"
    echo "   1. Go to Firebase Console > Firestore Database > Indexes"
    echo "   2. Click 'Create Index'"
    echo "   3. Use the configuration from firestore.indexes.json"
fi
