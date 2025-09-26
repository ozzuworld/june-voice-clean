#!/bin/bash

# fix-frontend-endpoint.sh
# Script to fix the frontend API endpoint to match working backend

set -e

echo "🔧 Fixing frontend endpoint configuration..."

# Navigate to your project directory (adjust path as needed)
# cd /path/to/your/june-voice-app

# Check if config file exists
CONFIG_FILE="config/app.config.ts"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: $CONFIG_FILE not found!"
    echo "Make sure you're in the project root directory"
    exit 1
fi

echo "📄 Found config file: $CONFIG_FILE"

# Backup original file
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo "💾 Created backup: $CONFIG_FILE.backup"

# Fix the endpoint - change '/v1/chat' to '/v1/conversation'
sed -i.tmp "s|CHAT: '/v1/chat'|CHAT: '/v1/conversation'|g" "$CONFIG_FILE"
rm -f "$CONFIG_FILE.tmp"

echo "✅ Updated CHAT endpoint from '/v1/chat' to '/v1/conversation'"

# Verify the change
echo "🔍 Verifying change:"
grep -n "CHAT:" "$CONFIG_FILE" || echo "Could not verify change"

echo ""
echo "✅ Frontend endpoint fix completed!"
echo "📱 Your app should now connect to the working backend endpoint"
echo ""
echo "Next steps:"
echo "1. Test your app to confirm it's working"
echo "2. If something goes wrong, restore with: cp $CONFIG_FILE.backup $CONFIG_FILE"
echo ""
echo "🚀 The frontend will now call: https://api.allsafe.world/v1/conversation"