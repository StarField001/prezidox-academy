# PREZIDOX ACADEMY — AI INSTRUCTIONS
> For: Black Box AI (Kimi K2.6) in VS Code
> Read this entire file before doing anything.

---

## WHAT THIS PROJECT IS

Prezidox Academy is a full-stack Nigerian CBT exam preparation platform.
Frontend: 24 plain HTML pages in /public
Backend: Node.js + Express + Prisma in /backend

---

## WHAT IS ALREADY DONE — DO NOT REBUILD

### Frontend — 100% Complete
All 24 HTML pages are fully built, styled, and working.
They live in the /public folder.
DO NOT create new HTML files.
DO NOT modify existing HTML files.
DO NOT delete HTML files.
DO NOT convert them to React or any framework.

### Backend — Fully Written
All Express routes, middleware, services, and utilities are written.
They live in the /backend folder.
DO NOT rewrite existing backend files.
You may ADD to them if something is genuinely missing.
But the architecture is already decided — follow it.

---

## WHAT STILL NEEDS TO BE DONE

1. npm install inside /backend
2. Create /backend/.env from /backend/.env.example
3. npx prisma generate
4. npx prisma migrate dev --name init
5. node prisma/seed.js
6. npm run dev — fix any errors until server starts
7. Wire frontend HTML pages to call the backend API
8. Test all flows
9. Deploy to Railway

---

## STRICT RULES — NEVER BREAK THESE

### Rule 1 — Never touch /public
The /public folder contains all HTML, CSS, and frontend JS.
It is 100% complete. Never create, edit, or delete files in /public.
If a task requires frontend changes, only add fetch() calls
inside the existing <script> tags on the relevant page.
Never change HTML structure, CSS, or page layout.

### Rule 2 — No frontend frameworks
The frontend is plain HTML, CSS, and Vanilla JavaScript.
Never install or use React, Vue, Angular, Next.js, Svelte, or any framework.
Never install webpack, vite, parcel, or any build tool for the frontend.

### Rule 3 — JWT in cookies only
Authentication uses JWT stored in httpOnly cookies.
Never use localStorage or sessionStorage for auth tokens.
All fetch calls from the frontend must include credentials: 'include'.

### Rule 4 — No fake data
Empty states only — never show placeholder numbers or fake users.
Real data comes from the database via the API.

### Rule 5 — No free wording
This is a paid platform with a trial period.
Never use the word "free" anywhere in content or code.

### Rule 6 — Paystack webhook security
The Paystack webhook at POST /api/payments/webhook must verify
the HMAC-SHA512 signature before processing any payment.
Never activate a subscription without verifying the signature.

### Rule 7 — Admin is separate
Admin auth is completely separate from student auth.
Admin JWT is separate from student JWT.
Admin routes use requireAdmin middleware.
Never mix student and admin authentication.

### Rule 8 — One step at a time
Complete one task fully before starting the next.
Show output after each terminal command.
Ask before running destructive commands (database reset, file deletion).

### Rule 9 — All dates 2026
Any dates in content, comments, or generated data must be 2026.

### Rule 10 — Legal disclaimer
All public pages must include:
"Prezidox Academy is not affiliated with UNILAG, OAU, JAMB, WAEC, NECO, or JUPEB."

---

## FOLDER STRUCTURE

```
prezidox-academy/
├── SPEC.md          ← full project specification
├── CLAUDE.md        ← this file
├── HANDOVER.md      ← step by step setup instructions
├── README.md        ← quick start guide
├── Dockerfile
├── railway.toml
├── .gitignore
├── public/          ← ALL HTML — NEVER MODIFY
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
        │   ├── auth.js
        │   ├── user.js
        │   ├── questions.js
        │   ├── sessions.js
        │   ├── payments.js
        │   ├── leaderboard.js
        │   ├── blog.js
        │   └── admin/
        │       ├── auth.js
        │       ├── users.js
        │       ├── questions.js
        │       ├── sessions.js
        │       ├── subscriptions.js
        │       ├── blog.js
        │       ├── leaderboard.js
        │       ├── settings.js
        │       ├── stats.js
        │       └── other.js
        ├── middleware/
        │   ├── auth.js
        │   ├── adminAuth.js
        │   └── rateLimiter.js
        ├── services/
        │   ├── email.js
        │   ├── paystack.js
        │   └── streak.js
        └── utils/
            ├── jwt.js
            └── prisma.js
```

---

## API REFERENCE SUMMARY

### Student endpoints
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/verify/:token
PATCH  /api/user/profile
GET    /api/questions
POST   /api/sessions/submit
GET    /api/sessions
GET    /api/sessions/:id
GET    /api/leaderboard?period=weekly|monthly|alltime
POST   /api/payments/initialize
POST   /api/payments/webhook
GET    /api/blog
GET    /api/blog/:slug
```

### Admin endpoints
```
POST   /api/admin/auth/login
GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:id
PATCH  /api/admin/users/:id/trial
PATCH  /api/admin/users/:id/subscription
PATCH  /api/admin/users/:id/suspend
GET    /api/admin/questions
POST   /api/admin/questions
PATCH  /api/admin/questions/:id
DELETE /api/admin/questions/:id
POST   /api/admin/questions/import
GET    /api/admin/sessions
GET    /api/admin/subscriptions
POST   /api/admin/subscriptions/manual
GET    /api/admin/blog
POST   /api/admin/blog
PATCH  /api/admin/blog/:id
DELETE /api/admin/blog/:id
GET    /api/admin/leaderboard
PATCH  /api/admin/leaderboard/adjust-points
POST   /api/admin/leaderboard/reset
GET    /api/admin/settings
PATCH  /api/admin/settings
```

---

## EXAM CATEGORIES

```js
// Active — students can access CBT
unilag:    UNILAG Post-UTME 2026
oau:       OAU Post-UTME 2026

// Coming Soon — show toast only
jamb:      JAMB / UTME
waec:      WAEC / WASSCE
neco:      NECO / SSCE
jupeb:     JUPEB
undergrad: Undergraduate Courses
```

---

## UNILAG SUBJECTS

Compulsory (always included, cannot be removed):
Use of English, Mathematics, General Knowledge

Electives (student picks min 2 max 3):
Biology, Chemistry, Physics, Further Mathematics, Economics,
Literature in English, Government, Geography, History, Agriculture, Commerce

---

## SUBSCRIPTION PLANS

| Plan | Price (₦) | Variable name |
|------|-----------|---------------|
| UNILAG Post-UTME 2026 | 4,500 | unilag |
| OAU Post-UTME 2026 | 4,500 | oau |
| All Exams 2026 Bundle | 8,500 | bundle |

---

## IF YOU ARE UNSURE

Read SPEC.md for full business logic details.
Read HANDOVER.md for the exact step-by-step setup instructions.
Ask before making any decision that affects architecture or deletes data.
