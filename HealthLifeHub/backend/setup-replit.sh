#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# HealthLifeHub — Replit First-Time Setup
# Run this once when you first open the Repl:
#   bash backend/setup-replit.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "🌿 HealthLifeHub — Replit Setup"
echo "================================"

# 1. Copy .env if it doesn't exist yet
if [ ! -f backend/.env ]; then
  echo "📋 Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
  echo "   ✅ Done. Open backend/.env and add your API keys."
else
  echo "   ℹ️  backend/.env already exists — skipping."
fi

# 2. Install dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

# 3. Generate Prisma client
echo ""
echo "⚙️  Generating Prisma client..."
npx prisma generate

# 4. Push schema to SQLite (creates dev.db automatically)
echo ""
echo "🗄️  Creating SQLite database (prisma/dev.db)..."
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open backend/.env and fill in your API keys"
echo "     (ANTHROPIC_API_KEY, GOOGLE_VISION_API_KEY, etc.)"
echo "  2. In the Replit Secrets panel (🔒), add the same keys as secrets"
echo "  3. Click the green Run button — the server will start automatically"
echo ""
echo "Your public API URL will be shown in the Replit webview after starting."
