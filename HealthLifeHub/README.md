# HealthLifeHub

**The Ultimate AI-Powered Health & Nutrition App**

Snap your food → Get instant calories. Scan your fridge → Get 3 recipes per diet plan.
Ask your AI coach anything. Track your full day automatically with the Invisible Log.

---

## What's Inside

```
HealthLifeHub/
├── backend/          Node.js + Express API server
├── mobile/           React Native + Expo mobile app (iOS & Android)
└── shared/types/     Shared TypeScript types
```

---

## Features

### Camera Intelligence
- **Plate Mode** — Snap any meal → instant calories, macros, Plate Balance Score
- **Fridge Mode** — Snap your fridge → detect ingredients → get 3 recipes (one per diet)
- **Barcode Mode** — Scan any food package → full nutrition label
- **Restaurant Mode** — Scan a physical menu → AI highlights best choices for your diet

### The Invisible Log
- Automatic persistent memory of everything you eat throughout the day
- Ask "Can I have dessert tonight?" and the AI knows your full day context
- No manual diary entry needed — just snap

### Three Diet Plans (Doctor-Approved)
| Plan | Focus | Color |
|------|-------|-------|
| DASH ❤️ | Heart health, blood pressure | Blue |
| Mediterranean 🫒 | Longevity, brain health | Green |
| Flexitarian 🥗 | Sustainable weight loss | Orange |

### AI Coach (Powered by Claude)
- Voice Q&A — ask anything in natural language
- Craving Translator — "I want chips" → healthy swap suggestion
- Dining Out Pre-Intel — scan a restaurant menu before you arrive
- Context-aware — knows your pantry, your remaining calories, your goal

### Calorie Tracking
- Animated daily ring (calories in vs. out)
- Exercise tracking: walking, running, cycling, gym, yoga, 12+ types
- IMU-based "weighted walk" detection (carrying groceries = more burn)
- Step count integration via Apple HealthKit / Google Health Connect

### Pantry & Fridge
- Scan fridge → auto-detect ingredients with expiry estimates
- Expiry alerts (3 days before)
- "Leftover Alchemist" — generate recipes from exactly what's about to expire
- Auto shopping list generation

### Weekly Report (Pro)
- Food Personality label ("Protein Powerhouse", "Plant Lover", etc.)
- Health Momentum Score (0-100)
- Plant variety count, organic %, diet adherence
- AI-generated weekly insight

### Multi-Language Support
🇬🇧 English · 🇪🇸 Español · 🇫🇷 Français · 🇩🇪 Deutsch · 🇵🇹 Português
🇮🇹 Italiano · 🇨🇳 中文 · 🇯🇵 日本語 · 🇸🇦 العربية · 🇮🇳 हिन्दी

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo (iOS + Android) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| State | Zustand |
| AI Coach | Claude API (Anthropic) |
| Food Vision | Google Vision API |
| Nutrition | Edamam API |
| Recipes | Spoonacular API |
| Barcodes | Open Food Facts (free) |
| Steps | Apple HealthKit + Google Health Connect |
| Storage | Cloudflare R2 |

---

## Getting Started

### 1. Clone & install

```bash
# Install backend dependencies
cd backend && npm install

# Install mobile dependencies
cd ../mobile && npm install
```

### 2. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your API keys

# Mobile
cp mobile/.env.example mobile/.env
```

### 3. Set up the database

```bash
cd backend
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:seed       # (optional) Seed sample data
```

### 4. Start the servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Mobile app
cd mobile && npx expo start
```

---

## API Keys You Need

| Service | Get it at | Cost |
|---------|----------|------|
| Anthropic (Claude) | anthropic.com | Pay per use |
| Google Vision | console.cloud.google.com | Free tier available |
| Edamam | developer.edamam.com | Free tier: 400 req/mo |
| Spoonacular | spoonacular.com | Free tier: 150 req/day |
| Supabase | supabase.com | Free tier available |
| Open Food Facts | openfoodfacts.org | Completely free |

---

## Monetization

| Tier | Price | Features |
|------|-------|---------|
| **Free** | $0 | 5 snaps/day, basic calorie tracking, step counter, 3 diet plan info pages |
| **Pro** | $9.99/mo | Unlimited snaps, fridge intelligence, AI voice coach, pantry scanning, weekly report, unlimited saved recipes |
| **Family** | $14.99/mo | All Pro features for up to 5 profiles |

---

## Legal / Compliance

All diet suggestions are framed as "General Wellness Information" per FDA 2026 guidance.
The app is positioned as a lifestyle tool, not a medical device.
All AI suggestions include the disclaimer: *"General wellness info only — not medical advice."*

---

## Roadmap

- [ ] Phase 1 (MVP): Plate snap + basic calorie ring + step tracking
- [ ] Phase 2: Fridge scan + recipe trio + voice AI coach
- [ ] Phase 3: Invisible Log + weekly report + pantry expiry
- [ ] Phase 4: Restaurant menu scanner + shopping list + family mode
- [ ] Phase 5: IMU weighted walk + seasonal intel + AR cooking mode
