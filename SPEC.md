# PREZIDOX ACADEMY — FULL PROJECT SPECIFICATION
> Version 2.0 | May 2026
> Read this entire document before writing any code.

---

## 1. WHAT IS PREZIDOX ACADEMY

A full-stack Nigerian CBT (Computer-Based Test) exam preparation platform.
Students pay a one-time subscription to access timed mock exams, adaptive
practice, and performance analytics for Nigerian university entrance exams.

Target exams: UNILAG Post-UTME, OAU Post-UTME, JAMB, WAEC, NECO, JUPEB

Legal disclaimer (must appear on all public pages):
"Prezidox Academy is an independent educational platform and is not affiliated
with, endorsed by, or officially connected to UNILAG, OAU, JAMB, WAEC, NECO,
or JUPEB."

---

## 2. TECH STACK

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | Plain HTML / CSS / Vanilla JS only      |
| Backend      | Node.js + Express                       |
| Database     | PostgreSQL via Prisma ORM               |
| Auth         | JWT in httpOnly cookies                 |
| Payments     | Paystack (Nigerian gateway)             |
| Email        | SendGrid                                |
| File Storage | Cloudinary (optional, for blog images)  |
| Deployment   | Railway or Render                       |

CRITICAL: The frontend is plain HTML/CSS/Vanilla JS.
Do NOT use React, Vue, Next.js, or any frontend framework. Ever.

---

## 3. DESIGN SYSTEM

```css
--navy:        #0B1F3A
--navy-mid:    #132c52
--navy-light:  #1e3f6e
--charcoal:    #1C1C1E
--gold:        #E5A100
--gold-bright: #F5B800
--gold-deep:   #C48900
--gold-pale:   #FFF8E6
--white:       #ffffff
--off-white:   #F9F8F5
--gray-50:     #F5F4F1
--gray-100:    #ECEAE5
--gray-200:    #D8D5CE
--gray-400:    #9B9790
--gray-600:    #5C5854
--gray-800:    #2E2C29
--border:      #E4E1DC
--green:       #18A34A
--green-pale:  #F0FDF4
--red:         #DC2626
--amber:       #D97706

Fonts: DM Serif Display (headings) + Inter (body)
```

---

## 4. ALL PAGES

### 4.1 Public Pages (no auth required)
- index.html — Homepage
- blog.html — Blog listing
- blog-post.html — Single blog post

### 4.2 Auth Pages
- signup.html — Register new account
- login.html — Log in
- forgot-password.html — Request password reset
- reset-password.html — Set new password via token

### 4.3 Student Pages (auth required)
- dashboard.html — Main hub
- cbt.html — Unified CBT exam engine (all 4 modes)
- custom-setup.html — Configure custom exam
- results.html — Post-exam results
- performance.html — Charts and session history
- leaderboard.html — Weekly, monthly, all-time rankings
- profile.html — Account settings
- subscription.html — Plans and billing

### 4.4 Admin Pages (admin auth required, at /admin/)
- admin/login.html
- admin/dashboard.html
- admin/users.html
- admin/questions.html
- admin/sessions.html
- admin/subscriptions.html
- admin/blog.html
- admin/leaderboard.html
- admin/settings.html

---

## 5. DATABASE SCHEMA

```prisma
model User {
  id               String        @id @default(cuid())
  firstName        String
  lastName         String
  email            String        @unique
  passwordHash     String
  emailVerified    Boolean       @default(false)
  verifyToken      String?
  resetToken       String?
  resetTokenExpiry DateTime?
  role             String        @default("student")
  examFocus        String        @default("unilag")
  selectedSubjects String[]      @default([])
  trialStartedAt   DateTime?
  trialExpiresAt   DateTime?
  points           Int           @default(0)
  streak           Int           @default(0)
  lastActiveDate   DateTime?
  suspended        Boolean       @default(false)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  subscription     Subscription?
  sessions         ExamSession[]
  leaderboard      LeaderboardEntry[]
  pointAdjustments PointAdjustment[]
}

model Subscription {
  id          String    @id @default(cuid())
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan        String    // "unilag", "oau", "bundle"
  status      String    // "active", "expired", "manual"
  paystackRef String?
  amountPaid  Int?      // in kobo
  paidAt      DateTime?
  expiresAt   DateTime?
  note        String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Question {
  id          String   @id @default(cuid())
  category    String   // "unilag", "oau", "jamb", "waec", "neco", "jupeb"
  subject     String
  topic       String
  year        Int?
  question    String
  optionA     String
  optionB     String
  optionC     String
  optionD     String
  answer      String   // "A", "B", "C", or "D"
  explanation String?
  glossary    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ExamSession {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  mode           String   // "study-topic", "mastery", "cbt", "custom"
  category       String
  subject        String?
  topic          String?
  score          Int
  totalQuestions Int
  correctAnswers Int
  timeTaken      Int      // seconds
  answers        Json
  completedAt    DateTime @default(now())
}

model LeaderboardEntry {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  period    String   // "weekly", "monthly", "alltime"
  points    Int      @default(0)
  rank      Int?
  weekKey   String?
  monthKey  String?
  updatedAt DateTime @updatedAt
  @@unique([userId, period, weekKey, monthKey])
}

model BlogPost {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  excerpt     String
  content     String
  category    String
  coverImage  String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Admin {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  passwordHash       String
  role               String    @default("admin")
  mustChangePassword Boolean   @default(true)
  lastLoginAt        DateTime?
  failedLoginCount   Int       @default(0)
  lockedUntil        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  auditLogs          AuditLog[]
  pointAdjustments   PointAdjustment[]
}

model PointAdjustment {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  adminId   String
  admin     Admin    @relation(fields: [adminId], references: [id])
  amount    Int
  reason    String
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  adminId   String
  admin     Admin    @relation(fields: [adminId], references: [id])
  action    String
  target    String
  detail    Json?
  createdAt DateTime @default(now())
}

model PlatformSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}
```

---

## 6. BUSINESS LOGIC

### Trial System
- Every new user gets a 72-hour free trial starting from FIRST LOGIN (not signup)
- No credit card required during trial
- Trial gives full access to all exam modes
- When trial expires all exam modes are locked
- Upgrade modal appears automatically on expiry
- Toast message: "Your trial has expired. Subscribe to continue."

### Subscription Plans
| Plan | Price | Validity |
|------|-------|----------|
| UNILAG Post-UTME 2026 | ₦4,500 | Until UNILAG screening is written |
| OAU Post-UTME 2026 | ₦4,500 | Until OAU screening is written |
| All Exams 2026 Bundle | ₦8,500 | All categories until each exam is written |

Payment flow:
1. Student selects plan and clicks pay
2. Backend calls Paystack initialize → returns payment URL
3. Student pays on Paystack
4. Paystack sends webhook to POST /api/payments/webhook
5. Backend verifies HMAC-SHA512 signature
6. Backend activates subscription in database

### Exam Categories
```js
const CATEGORIES = {
  unilag:    { status: "active" },
  oau:       { status: "active" },
  jamb:      { status: "coming_soon" },
  waec:      { status: "coming_soon" },
  neco:      { status: "coming_soon" },
  jupeb:     { status: "coming_soon" },
  undergrad: { status: "coming_soon" },
}
```
Clicking coming-soon → toast: "This exam is coming soon."
No access to CBT for coming-soon categories.

### UNILAG Subject Structure
Compulsory (locked, always included):
- Use of English
- Mathematics
- General Knowledge

Electives (student picks min 2, max 3):
Biology, Chemistry, Physics, Further Mathematics, Economics,
Literature in English, Government, Geography, History, Agriculture, Commerce

### Points Formula
```js
const points = Math.round((correctAnswers / totalQuestions) * 100);
// Added to user.points after every completed session
```

### Streak Logic
```js
const today = new Date().toDateString();
const lastActive = user.lastActiveDate?.toDateString();
const yesterday = new Date(Date.now() - 86400000).toDateString();

if (lastActive === yesterday) {
  user.streak += 1;       // consecutive day
} else if (lastActive !== today) {
  user.streak = 1;        // missed a day, restart
}
// if lastActive === today: no change
user.lastActiveDate = new Date();
```

---

## 7. EXAM MODES

### URL Parameters
```
cbt.html?mode=study-topic&category=unilag&subject=Mathematics
cbt.html?mode=mastery&category=unilag&subject=Chemistry
cbt.html?mode=cbt&category=unilag
cbt.html?mode=custom&category=unilag&config=BASE64_CONFIG
```

### Mode Behaviour
| Feature          | Study Topic | Mastery | Full CBT | Custom      |
|------------------|-------------|---------|----------|-------------|
| Timer            | Optional    | None    | Strict   | User config |
| Show Answer      | Yes         | Yes     | Never    | User config |
| Explanation      | Yes         | Yes     | Never    | User config |
| Mark for review  | Yes         | Yes     | Yes      | Yes         |
| Auto-submit      | No          | No      | Yes      | User config |
| Adaptive         | No          | Yes     | No       | No          |

---

## 8. API ROUTES

### Student API
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/verify/:token
GET    /api/auth/me

PATCH  /api/user/profile
PATCH  /api/user/exam-focus
PATCH  /api/user/subjects

GET    /api/questions?category=&subject=&topic=&year=&limit=&mode=
GET    /api/questions/topics?category=&subject=
GET    /api/questions/subjects?category=
GET    /api/questions/years?category=&subject=

POST   /api/sessions/submit
GET    /api/sessions
GET    /api/sessions/:id

GET    /api/leaderboard?period=weekly|monthly|alltime

POST   /api/payments/initialize
POST   /api/payments/webhook
GET    /api/payments/verify/:reference
GET    /api/payments/status

GET    /api/blog
GET    /api/blog/:slug
```

### Admin API
```
POST   /api/admin/auth/login
POST   /api/admin/auth/logout

GET    /api/admin/stats

GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
PATCH  /api/admin/users/:id/suspend
PATCH  /api/admin/users/:id/trial
PATCH  /api/admin/users/:id/subscription

GET    /api/admin/questions
POST   /api/admin/questions
PATCH  /api/admin/questions/:id
DELETE /api/admin/questions/:id
POST   /api/admin/questions/import
GET    /api/admin/questions/export

GET    /api/admin/sessions
GET    /api/admin/sessions/:id

GET    /api/admin/subscriptions
PATCH  /api/admin/subscriptions/:id
POST   /api/admin/subscriptions/manual

GET    /api/admin/blog
POST   /api/admin/blog
PATCH  /api/admin/blog/:id
DELETE /api/admin/blog/:id

GET    /api/admin/leaderboard
PATCH  /api/admin/leaderboard/adjust-points
POST   /api/admin/leaderboard/reset
DELETE /api/admin/leaderboard/disqualify/:userId

GET    /api/admin/settings
PATCH  /api/admin/settings
```

---

## 9. EMAIL FLOWS

| Trigger | Email Sent |
|---------|-----------|
| New signup | Welcome + email verification link |
| Email verified | Confirmation email |
| First login | Trial started (with expiry time) |
| 24hrs before trial expires | Trial ending reminder |
| Trial expired | Subscribe to continue |
| Successful payment | Subscription confirmation |
| Forgot password | Reset link (expires in 1 hour) |
| Password changed | Security notification |

---

## 10. ENVIRONMENT VARIABLES

```env
DATABASE_URL=postgresql://...
JWT_SECRET=
JWT_EXPIRES_IN=7d
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@prezidox.com
EMAIL_FROM_NAME=Prezidox Academy
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=admin@prezidox.com
ADMIN_PASSWORD=changeme_on_first_login
ADMIN_NAME=Prezidox Admin
NODE_ENV=production
APP_URL=https://prezidox.com
PORT=3000
```

---

## 11. SECURITY REQUIREMENTS

- Passwords hashed with bcrypt (minimum 12 rounds)
- JWT stored in httpOnly cookies only — never localStorage
- Paystack webhook verified using HMAC-SHA512 signature
- All admin routes protected by requireAdmin middleware
- Rate limiting on: login, register, forgot-password, payments
- Helmet.js for HTTP security headers
- CORS configured for production domains only
- All admin actions logged to AuditLog table
- Admin accounts lock after 5 failed login attempts

---

## 12. SEED DATA

Seed file must create:
- 20 questions per subject for UNILAG category
  Subjects: Use of English, Mathematics, General Knowledge, Chemistry, Physics
- 2 published blog posts with 2026 dates
- 1 admin account using ADMIN_EMAIL and ADMIN_PASSWORD from .env
- Admin must be forced to change password on first login

---

## 13. GOLDEN RULES

1. Frontend is plain HTML/CSS/Vanilla JS — NO React, NO Vue, NO framework
2. No fake data shown to users — empty states only
3. No "free" wording anywhere — paid platform with trial
4. Google Sign-In button exists but is disabled with "(Coming Soon)" label
5. All content dates must be 2026
6. Legal disclaimer on all public pages
7. Mobile responsive on every single page
8. No emojis in UI anywhere
9. Coming Soon categories: toast only, no CBT access
10. UNILAG: 3 compulsory locked subjects + min 2 max 3 electives
11. Admin panel auth completely separate from student auth
12. JWT in httpOnly cookies only — never localStorage
