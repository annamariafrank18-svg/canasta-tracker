# Canasta Tracker 🃏

Eine App, die Canasta-Spielrunden automatisch erfasst, analysiert und in persönliche Statistiken + Social Insights verwandelt.

## Projektstruktur

```
canasta-app/
├── backend/          # Node.js + Express + PostgreSQL API
│   ├── prisma/       # Datenbankschema & Migrations
│   └── src/          # API Source Code
├── mobile/           # React Native / Expo App
│   └── src/
│       ├── api/      # API Client
│       ├── navigation/
│       ├── screens/
│       └── store/    # Zustand State Management
└── render.yaml       # Render Deployment Config
```

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# .env anpassen (DATABASE_URL + JWT_SECRET)
npx prisma migrate dev
npm run dev
```

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

## Deployment (Render)

1. GitHub Repo erstellen & pushen
2. Auf [render.com](https://render.com) → "New Blueprint Instance"
3. Repo verbinden → `render.yaml` wird automatisch erkannt
4. PostgreSQL + Web Service werden erstellt

## Features (MVP - Phase 1)

- [x] User Auth (Register/Login)
- [x] Spieler verwalten
- [x] Spielgruppen
- [x] Manuelle Spieleingabe (2 Klicks)
- [x] Basis-Statistiken (Winrate, Punkte, Spiele)
- [x] Spieler-Ranking
- [x] Fun Stats (GOAT, Streak King, Point Machine)
- [x] Spieler-Detail (Partner-Analyse, Letzte Form)

## Nächste Phasen

- Phase 2: Zeitbasierte Analyse, Streaks, Trends
- Phase 3: 📸 Foto-Erkennung (OCR mit ML Kit)
- Phase 4: Sharing, Badges, Premium Features
