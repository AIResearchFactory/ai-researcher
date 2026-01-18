#!/bin/bash

# Pre-commit hook to run tests and verification
# This script is used by developers and the AI agent to ensure code quality before committing.

echo "🔍 Running pre-commit checks..."

# 1. Backend Tests (Rust)
echo "🦀 Running Rust tests..."
cd src-tauri
if ! cargo test --quiet; then
    echo "❌ Backend tests failed!"
    exit 1
fi
cd ..

# 2. Frontend Build Verification
echo "⚛️ Verifying frontend build..."
if ! npm run build; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ All checks passed!"
exit 0
