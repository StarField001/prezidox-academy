# PREZIDOX ACADEMY — HANDOVER INSTRUCTIONS
> Tool: Black Box AI with Kimi K2.6 inside VS Code
> Read everything before starting.

---

## WHAT IS ALREADY DONE

### Frontend — 100% Complete
24 HTML pages in /public. All styled, all working. Do not touch them.

### Backend — Written, Not Running
All Express routes, Prisma schema, middleware, services, and seed file
are in /backend. Just needs installing, configuring, and starting.

### What You Need to Do
1. Collect 3 external values (database URL, Paystack keys, SendGrid key)
2. Install Black Box AI in VS Code
3. Follow the step-by-step messages below in order

---

## BEFORE YOU START — COLLECT THESE VALUES

You need these before you can set up the .env file.
Get them all first so you are not interrupted mid-session.

### 1. DATABASE_URL — Free PostgreSQL from Neon
- Go to neon.tech and sign up free (no card needed)
- Click New Project → name it prezidox → Create Project
- Copy the connection string shown — looks like:
  postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/prezidox?sslmode=require
- Save it somewhere

### 2. PAYSTACK TEST KEYS
- Go to dashboard.paystack.com and sign up free
- Go to Settings → API Keys & Webhooks
- Copy Test Secret Key (starts with sk_test_)
- Copy Test Public Key (starts with pk_test_)
- Save both

### 3. SENDGRID API KEY — Free email service
- Go to sendgrid.com and sign up free (100 emails/day free)
- Go to Settings → API Keys → Create API Key
- Name: Prezidox → Full Access → Create and View
- Copy the key (starts with SG.)
- Also go to Settings → Sender Authentication → verify your email address
- Save the key

### 4. Choose Your Admin Credentials
Pick an email and strong password for the admin panel.
Example:
- ADMIN_EMAIL: admin@prezidox.com
- ADMIN_PASSWORD: MyStr0ngPass!2026

---

## STEP 1 — INSTALL BLACK BOX AI

1. Open VS Code
2. Press Ctrl+Shift+X to open Extensions
3. Search BLACKBOX AI
4. Click Install
5. Click the Black Box icon that appears in the left sidebar
6. Sign up free at blackbox.ai when prompted
7. Sign in inside VS Code

---

## STEP 2 — OPEN YOUR PROJECT

1. In VS Code click File → Open Folder
2. Select your prezidox-academy folder
3. You should see all files in the left sidebar

---

## STEP 3 — OPEN BLACK BOX AI AGENT

1. Click the Black Box AI icon in the sidebar
2. Make sure you are in Agent mode (not just Chat)
3. Change the model to Kimi K2.6

---

## NOW FOLLOW THESE MESSAGES IN ORDER
## Copy and paste each one exactly. Wait for it to finish before sending the next.

---

### MESSAGE 1 — READ AND SUMMARISE

```
Read these files before doing anything at all:
- SPEC.md
- CLAUDE.md
- backend/.env.example
- backend/src/app.js
- backend/prisma/schema.prisma

After reading all of them tell me:
1. What this project is in one paragraph
2. What the /public folder contains
3. What the /backend folder contains
4. The strict rules you must follow
5. What still needs to be done

Do not run any commands yet. Just read and summarise.
```

Wait for the summary. If it is correct and mentions the rules about
not touching /public, send Message 2.
If it gets something wrong, correct it before continuing.

---

### MESSAGE 2 — INSTALL DEPENDENCIES

```
Good. Step 1 only.
Open a terminal, go into the backend/ folder, and run:

npm install

Show me the full output when done. Stop and wait for me.
Do not do anything else.
```

Wait for it to finish. You should see packages being installed.
When done send Message 3.

---

### MESSAGE 3 — CREATE .ENV FILE

Replace the placeholder values below with your real values before sending.

```
Step 2. Create the file backend/.env by copying backend/.env.example.
Fill it with these exact values:

DATABASE_URL="YOUR_NEON_CONNECTION_STRING_HERE"
JWT_SECRET=
JWT_EXPIRES_IN=7d
PAYSTACK_SECRET_KEY="YOUR_SK_TEST_KEY_HERE"
PAYSTACK_PUBLIC_KEY="YOUR_PK_TEST_KEY_HERE"
SENDGRID_API_KEY="YOUR_SG_KEY_HERE"
EMAIL_FROM="noreply@prezidox.com"
EMAIL_FROM_NAME="Prezidox Academy"
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL="YOUR_ADMIN_EMAIL_HERE"
ADMIN_PASSWORD="YOUR_ADMIN_PASSWORD_HERE"
ADMIN_NAME="Prezidox Admin"
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000

For JWT_SECRET run this command and use the output:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

Show me the completed .env file with secret values replaced by asterisks.
Stop and wait for me.
```

---

### MESSAGE 4 — GENERATE PRISMA CLIENT

```
Step 3. Inside the backend/ folder run:

npx prisma generate

Show me the output. Stop and wait for me.
```

---

### MESSAGE 5 — RUN DATABASE MIGRATION

```
Step 4. Inside the backend/ folder run:

npx prisma migrate dev --name init

This creates all the database tables.
Show me the full output. Stop and wait for me.
```

You should see: "Your database is now in sync with your schema"
If you see errors paste them and ask it to fix them.

---

### MESSAGE 6 — SEED THE DATABASE

```
Step 5. Inside the backend/ folder run:

node prisma/seed.js

This creates sample questions, blog posts, and your admin account.
Show me the full output. Stop and wait for me.
```

---

### MESSAGE 7 — START THE SERVER

```
Step 6. Inside the backend/ folder run:

npm run dev

Show me the full output.
The server should start on http://localhost:3000.
If there are errors fix them one by one until the server starts cleanly.
```

Open your browser and go to http://localhost:3000
Your homepage should load. If it does, send Message 8.

---

### MESSAGE 8 — WIRE AUTH PAGES

```
The server is running at http://localhost:3000.

Now wire the frontend to the backend API.

IMPORTANT RULES for all wiring work:
- Never modify HTML structure, CSS, or page layout
- Only add fetch() calls inside existing <script> tags
- All fetch calls must use: credentials: 'include'
- On auth errors show the message in the existing error element
- On success redirect to the correct page

Wire these two pages now:

1. public/signup.html
   POST to /api/auth/register
   Body: { firstName, lastName, email, password, examFocus }
   On success: redirect to /login.html?registered=1
   On error: show error message

2. public/login.html
   POST to /api/auth/login
   Body: { email, password }
   On success: redirect to /dashboard.html
   On error: show error message

Show me exactly what lines you changed in each file.
Stop and wait for me.
```

Test signup and login in your browser before sending Message 9.

---

### MESSAGE 9 — WIRE DASHBOARD

```
Wire public/dashboard.html to the API.

On page load:
1. Call GET /api/auth/me
2. If response is 401 or error redirect to /login.html
3. Populate the greeting with user.firstName
4. Calculate trial countdown using user.trialExpiresAt
5. Show user.points in the points card
6. Show user.streak in the streak card
7. Show user.examFocus in the exam focus card

Only add to the existing <script> tag.
Do not change any HTML or CSS.
Show me exactly what you added. Stop and wait for me.
```

---

### MESSAGE 10 — WIRE CBT AND RESULTS

```
Wire the exam engine and results page.

1. public/cbt.html
   Find the finalSubmit() function.
   After clearing the timer, POST to /api/sessions/submit with:
   {
     mode: MODE,
     category: CATEGORY,
     subject: SUBJECT,
     totalQuestions: QUESTIONS.length,
     correctAnswers: number of correct answers,
     score: percentage score (0-100),
     timeTaken: seconds taken,
     answers: the answers object
   }
   Store the returned session.id in sessionStorage as px_session_id
   Then redirect to results.html

2. public/results.html
   On page load check sessionStorage for px_session_id
   If found call GET /api/sessions/px_session_id and use real data
   If not found use the existing demo fallback

Only modify existing script tags. Do not change HTML or CSS.
Show me what you changed. Stop and wait for me.
```

---

### MESSAGE 11 — WIRE REMAINING STUDENT PAGES

```
Wire these remaining student pages. One at a time.

1. public/performance.html
   On load call GET /api/sessions to load real session history
   Call GET /api/auth/me for the stats cards at the top

2. public/leaderboard.html
   On load call GET /api/leaderboard?period=weekly
   When monthly tab clicked call GET /api/leaderboard?period=monthly
   When alltime tab clicked call GET /api/leaderboard?period=alltime

3. public/subscription.html
   When Pay with Paystack is clicked call POST /api/payments/initialize
   Send body: { plan: selectedPlan } where plan is "unilag", "oau", or "bundle"
   Redirect to the paymentUrl returned in the response

4. public/profile.html
   Save Changes button: PATCH /api/user/profile with { firstName, lastName, email }
   Update Password button: PATCH /api/user/profile with { currentPassword, newPassword }
   Show success or error message after each

5. public/forgot-password.html — verify the existing form works against /api/auth/forgot-password
6. public/reset-password.html — verify the existing form works against /api/auth/reset-password

Only modify existing script tags. Show me what changed. Stop and wait.
```

---

### MESSAGE 12 — WIRE ADMIN PAGES

```
Wire all 9 admin pages to the admin API.

Rules:
- Check for admin auth on every page load using GET /api/admin/auth/me or similar
- If not authenticated redirect to /admin/login.html
- Only add to existing script tags

1. admin/login.html
   POST to /api/admin/auth/login
   On success redirect to /admin/dashboard.html

2. admin/dashboard.html
   GET /api/admin/stats on load
   Populate all stat cards with real numbers

3. admin/users.html
   GET /api/admin/users to load table
   Wire search input to re-fetch with ?search= param
   Wire status filter to re-fetch with ?status= param
   Extend Trial button: PATCH /api/admin/users/:id/trial
   Activate Sub button: PATCH /api/admin/users/:id/subscription
   Suspend button: PATCH /api/admin/users/:id/suspend

4. admin/questions.html
   GET /api/admin/questions to load table
   Add Question form: POST /api/admin/questions
   Edit button: PATCH /api/admin/questions/:id
   Delete button: DELETE /api/admin/questions/:id

5. admin/sessions.html
   GET /api/admin/sessions to load table
   Wire filters to re-fetch with query params

6. admin/subscriptions.html
   GET /api/admin/subscriptions to load table
   Manual Payment form: POST /api/admin/subscriptions/manual

7. admin/blog.html
   GET /api/admin/blog to load posts table
   New Post form: POST /api/admin/blog
   Publish/Unpublish: PATCH /api/admin/blog/:id
   Delete: DELETE /api/admin/blog/:id

8. admin/leaderboard.html
   GET /api/admin/leaderboard to load rankings
   Adjust Points form: PATCH /api/admin/leaderboard/adjust-points
   Reset Weekly: POST /api/admin/leaderboard/reset { period: "weekly" }
   Reset Monthly: POST /api/admin/leaderboard/reset { period: "monthly" }

9. admin/settings.html
   GET /api/admin/settings on load to populate all fields
   Each Save button: PATCH /api/admin/settings

Only modify existing script tags. Do not change HTML or CSS.
Work through them one by one. Stop after each for my confirmation.
```

---

### MESSAGE 13 — DEPLOY TO RAILWAY

Send this when everything is working locally:

```
Everything works locally. Help me deploy to Railway.

The project already has a Dockerfile and railway.toml.

Guide me step by step:
1. Help me initialise a git repo and make the first commit
2. Help me push to GitHub
3. Walk me through connecting the repo to Railway
4. Help me add a PostgreSQL plugin on Railway
5. List all environment variables I need to add in Railway settings
6. Confirm the deployment is live
```

---

## TESTING CHECKLIST

Do this manually in your browser before deploying:

Student side:
- [ ] Sign up with a real email — receive verification email
- [ ] Click verification link — account confirmed
- [ ] Log in — redirected to dashboard
- [ ] Dashboard shows your real name and trial countdown
- [ ] Start a Full CBT exam — answer questions — submit
- [ ] Results page shows correct score and points earned
- [ ] Performance page shows the session
- [ ] Subscription page — click Pay with Paystack — redirected to Paystack
- [ ] Forgot password — receive reset email — reset works

Admin side:
- [ ] Open http://localhost:3000/admin/login.html
- [ ] Log in with ADMIN_EMAIL and ADMIN_PASSWORD from your .env
- [ ] Dashboard shows real user and session counts
- [ ] Add a question on Questions page — it appears in the table
- [ ] Create a blog post — it appears on /blog.html

---

## COMMON ERRORS AND EXACT FIXES

Cannot find module @prisma/client
→ Run: cd backend && npx prisma generate

Environment variable not found: DATABASE_URL
→ Your .env file is in the wrong place
→ Make sure it is at backend/.env not prezidox-academy/.env

P1001 Cannot reach database server
→ Check your DATABASE_URL is correct
→ Check your Neon project is active at neon.tech

relation "User" does not exist
→ Tables not created yet
→ Run: npx prisma migrate dev --name init

Error secretOrPrivateKey must have a value
→ JWT_SECRET is missing from backend/.env

CORS error in browser console
→ You are opening the HTML file directly (file://)
→ Always open http://localhost:3000 instead

Port 3000 already in use
→ Run: npx kill-port 3000
→ Then run: npm run dev again

Paystack webhook returns 400
→ Webhook signature verification is failing
→ Make sure PAYSTACK_SECRET_KEY in .env matches the key in Paystack dashboard

Cannot POST /api/auth/login (404)
→ Server is not running
→ Run npm run dev in the backend/ folder

---

## GOLDEN RULES — TELL THE AI THESE AT THE START OF EVERY SESSION

If you start a new session paste this at the top:

```
STRICT RULES — Never break these:
1. Never create, modify, or delete any file in /public
2. Never install React, Vue, Next.js, or any frontend framework
3. Never rewrite existing backend files
4. Frontend is plain HTML, CSS, Vanilla JS only
5. All fetch calls use credentials: 'include'
6. JWT in httpOnly cookies only — never localStorage
7. Verify Paystack webhook HMAC-SHA512 signature before activating subscriptions
8. Admin routes use requireAdmin middleware — separate from student auth
9. No fake data — empty states only
10. Ask before running destructive commands
```

---

Prezidox Academy
Frontend built in Claude.ai chat
Completion with Black Box AI (Kimi K2.6) in VS Code
