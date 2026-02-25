# 🥋 Roll Call — BJJ Gym Tracker

A social check-in app for BJJ practitioners. Track your mat time, compete on your gym's leaderboard, earn badges from your coach.

## Features

- **One-tap check-in/out** — Select class type (Gi, No-Gi, Open Mat, Comp, Private), tap check in, train, tap check out
- **Personal stats** — Sessions, hours, streaks, weekly chart, session history
- **Gym leaderboard** — Monthly rankings by sessions, hours, or unique training days
- **Gym system** — Create a gym or join one with an invite code
- **Badges** — Gym owners create and award custom badges to members
- **Live counter** — See how many people are currently on the mat
- **Optional debrief** — Rate your energy (1-5) and add a quick note after each session

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Supabase (Postgres + Auth + Row Level Security)
- **Hosting**: Vercel

---

## Setup Guide

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, choose a name and password
3. Wait for the project to be ready (~1 min)

### 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this repo
3. Copy-paste the entire content into the SQL editor
4. Click **Run** — this creates all tables, views, and security policies

### 3. Configure Auth

1. In Supabase, go to **Authentication → Settings**
2. Under **Email Auth**, make sure **Enable Email Signup** is ON
3. (Optional) Disable **Confirm email** for faster testing during dev

### 4. Get Your API Keys

1. In Supabase, go to **Settings → API**
2. Copy the **Project URL** and the **anon/public** key

### 5. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your-key
```

### 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 7. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add the two environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**

---

## Project Structure

```
├── supabase/
│   └── schema.sql            # Full database schema (run in Supabase SQL Editor)
├── src/
│   ├── lib/
│   │   └── supabase.js       # Supabase client
│   ├── contexts/
│   │   └── AuthContext.jsx    # Auth + profile + gym state
│   ├── pages/
│   │   ├── AuthPage.jsx      # Login / Signup
│   │   ├── GymSetup.jsx      # Create or join a gym
│   │   ├── CheckInPage.jsx   # Check in/out + debrief
│   │   ├── StatsPage.jsx     # Personal dashboard
│   │   ├── GymPage.jsx       # Leaderboard + invite code
│   │   └── ProfilePage.jsx   # Profile settings + gym admin
│   ├── App.jsx               # Router + tab bar
│   ├── main.jsx              # Entry
│   └── index.css             # Global styles
├── .env.example
├── package.json
└── vite.config.js
```

## Gym Owner Guide

1. Sign up and click **Create a new gym**
2. Share the **invite code** with your members (visible in the Gym tab)
3. Go to **Profile → Gym Admin** to:
   - Create custom badges (e.g. 🦁 Iron Man, 🧪 Lab Rat, 🏆 Competitor)
   - Award badges to members
   - View all members

## License

MIT
