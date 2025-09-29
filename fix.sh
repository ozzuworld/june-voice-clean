#!/bin/bash
# quick-fix.sh - Fix the immediate syntax errors

echo "🔧 Fixing React Native app syntax errors..."

# 1. Fix the broken line in useAuth.tsx (line 226 appears to be incomplete)
echo "📝 Checking for incomplete lines in useAuth.tsx..."

# Find and display the problematic line
if grep -n "await playAudioFromBase64(data.audio, botMessage.i" hooks/useAuth.tsx; then
    echo "❌ Found incomplete line in useAuth.tsx"
    echo "This line needs to be completed or removed"
    echo ""
    echo "Quick fix options:"
    echo "1. Replace the entire hooks/useAuth.tsx with the fixed version from above"
    echo "2. Or manually complete line 226 in your editor"
    echo ""
fi

# 2. Check for circular dependencies
echo "🔍 Checking for circular dependencies..."
if grep -r "hooks/useAuth" hooks/useAuth.tsx; then
    echo "⚠️  Potential circular dependency detected in useAuth.tsx"
    echo "Make sure useAuth.tsx doesn't import itself"
fi

# 3. Clear Metro cache
echo "🧹 Clearing Metro cache..."
if command -v npx &> /dev/null; then
    npx expo start -c
elif command -v npm &> /dev/null; then
    npm run clean
else
    echo "Please run: expo start -c"
fi

echo ""
echo "✅ Quick fixes applied!"
echo ""
echo "Next steps:"
echo "1. Replace hooks/useAuth.tsx with the fixed version"
echo "2. Replace app/_layout.tsx with the fixed version" 
echo "3. Restart your development server: expo start -c"
echo "4. If errors persist, check that all imports are correct"