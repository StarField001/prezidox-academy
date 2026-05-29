# Prezidox Academy

Nigerian CBT exam preparation platform.
One-time payment. Full access until your exam is written.

---

## What Is This

A full-stack web application for students preparing for:
- UNILAG Post-UTME 2026 — Active
- OAU Post-UTME 2026 — Active
- JAMB, WAEC, NECO, JUPEB — Coming Soon

Features: Study Topic Mode, Mastery Mode, Full CBT Simulation, Custom Exams,
Performance Analytics, Leaderboard, Admin Panel.

---

## Project Structure

```
prezidox-academy/
├── SPEC.md          ← full project specification
├── CLAUDE.md        ← AI instructions and project rules
├── HANDOVER.md      ← step-by-step setup guide
├── README.md        ← this file
├── Dockerfile
├── railway.toml
├── public/          ← all frontend HTML pages (complete)
│   ├── index.html
│   ├── signup.html
│   ├── login.html
│   ├── dashboard.html
│   ├── cbt.html
│   ├── custom-setup.html
│   ├── results.html
│   ├── performance.html
│   ├── leaderboard.html
│   ├── profile.html
│   ├── subscription.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   ├── blog.html
│   ├── blog-post.html
│   └── admin/
│       ├── login.html
│       ├── dashboard.html
│       ├── users.html
│       ├── questions.html
│       ├── sessions.html
│       ├── subscriptions.html
│       ├── blog.html
│       ├── leaderboard.html
│       └── settings.html
└── backend/
    ├── package.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.js
    └── src/
        ├── app.js
        ├── routes/
        ├── middleware/
        ├── services/
        └── utils/
```

---

## Quick Start

```bash
# 1. Go into backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Copy environment variables file
cp .env.example .env
# Fill in your values — see HANDOVER.md for where to get each one

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migration
npx prisma migrate dev --name init

# 6. Seed the database
node prisma/seed.js

# 7. Start the server
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

See `.env.example` for all required variables.
See `HANDOVER.md` for where to get each value.

Key services needed:
- PostgreSQL database — free at neon.tech
- Paystack account — free at dashboard.paystack.com
- SendGrid account — free at sendgrid.com

---

## Tech Stack

- Frontend: HTML / CSS / Vanilla JavaScript
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Auth: JWT in httpOnly cookies
- Payments: Paystack
- Email: SendGrid
- Deployment: Railway

---

## Admin Panel

Access at: http://localhost:3000/admin/login.html

Credentials are set in your .env file:
- ADMIN_EMAIL
- ADMIN_PASSWORD

---

## Deployment

The project includes a Dockerfile and railway.toml.
See HANDOVER.md Message 13 for full deployment instructions.

---

## Legal

Prezidox Academy is an independent educational platform.
Not affiliated with UNILAG, OAU, JAMB, WAEC, NECO, or JUPEB.
