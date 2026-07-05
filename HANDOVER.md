# PREZIDOX ACADEMY — CLAUDE CODE HANDOVER
> Read every word of this before touching a single file.
> This is a live production platform. Real users will use this.

---

## WHAT THIS IS

Prezidox Academy is a full-stack Nigerian CBT exam preparation platform targeting UNILAG Post-UTME and OAU Post-UTME students. It has a question bank, 5 study modes, battle mode (real-time WebSocket), leaderboard, ranking system, notifications, subscription payments, and a full admin panel.

**Live URL:** https://prezidox-academy-production.up.railway.app
**GitHub:** https://github.com/StarField001/prezidox-academy
**Stack:** Node.js + Express + Prisma ORM + PostgreSQL (Railway) + Socket.io + SendGrid
**Frontend:** Pure HTML + CSS + Vanilla JS — NO frameworks ever.

---

## HOW TO START EVERY SESSION

**Step 1** — Select Fable 5 in Claude Code:
```
/model fable
```

**Step 2** — Paste this opening prompt:
> "Read CLAUDE.md and HANDOVER.md fully before doing anything. You are working on Prezidox Academy — a live Nigerian edtech platform. All 19 subject question banks are fully imported for Topic Drill. Year Vault questions are not yet written. Use all installed skills automatically. Tell me when to switch models using the exact format in CLAUDE.md. Current task: [STATE YOUR TASK HERE]."

**Step 3** — When Claude says ⚡ SWITCH MODEL NOW, type the command and re-send your last message.

---

## MODEL QUICK REFERENCE

| Task | Command |
|------|---------|
| Homepage, dashboard, mode overhauls, complex planning | `/model fable` |
| Building pages, bug fixes, backend routes, implementing | `/model opus` |
| Reading files, small edits, running scripts | `/model sonnet` |

---

## INSTALLED SKILLS — ALL AUTO-TRIGGERED

- **impeccable** — after every HTML/CSS edit
- **frontend-design** — before any UI work
- **animation-principles** — every animation and transition
- **ui-ux-pro-max** — designing or retouching any page
- **webapp-testing** — after any page is built or fixed
- **a11y-skill** — after any page is polished
- **prisma-cli / prisma-client-api / prisma-database-setup** — all DB work
- **debugging-code** — moment any error appears
- **claude-seo** — index.html and blog.html before launch
- **shannon** — before any production deployment
- **excalidraw-diagram** — planning architecture or flows
- **seo-geo** — keyword research for homepage

---

## CURRENT STATE

**All student pages built:** index.html, login.html, signup.html, profile-setup.html, dashboard.html, performance.html, topic-drill.html, flash-cbt.html, year-vault.html, speed-burst.html, speed-results.html, battle.html, battle-setup.html, battle-lobby.html, battle-arena.html, battle-results.html, battle-tournament.html, battle-history.html, results.html, leaderboard.html, profile.html, notifications.html, blog.html, how-it-works.html, custom-setup.html

**All admin pages built:** admin/dashboard.html, admin/questions.html, admin/users.html, admin/sessions.html, admin/leaderboard.html, admin/notifications.html, admin/community.html, admin/blog.html

**Backend:** All routes, Prisma schema, Socket.io, notification service, ranking engine built.

**Question bank:** ✅ All 19 subjects imported for Topic Drill | ⏳ Year Vault not yet written

---

## PENDING TASKS — IN PRIORITY ORDER

### 1. Homepage Rebuild (index.html) — START HERE, USE FABLE 5

Full world-class rebuild. Benchmark: Prep50, Pass.ng, Duolingo, Khan Academy.

Sections:
- **Hero:** strong value prop, real Unsplash photo (Nigerian students), primary CTA "Start Free Trial", secondary "See How It Works"
- **Stats bar:** total questions, active students, pass rate, study modes
- **5 Study Modes showcase:** visual cards, what each mode does, when to use it
- **How it works:** 3 steps with icons
- **Blog preview:** featured post + 3 recent posts with images, categories
- **Testimonials:** 3–4 student quotes with avatars
- **Pricing:** all 3 plans side by side, trial CTA
- **FAQ:** 6–8 questions accordion
- **Footer:** nav links, social icons (placeholder href="#"), legal disclaimer, copyright 2026

Standards: DM Serif Display + Inter | Navy/Gold/Off-white | Mobile-first 360px | NO emojis | SVG only
After completing: run impeccable + a11y-skill + claude-seo

---

### 2. Dashboard Expert Retouch — USE FABLE 5

Most important app page. Full redesign:
- Hero greeting: "Good morning, [Name]" + rank badge + streak flame counter
- 4 stat cards: glassmorphism on navy (points, rank, streak, sessions) with count-up animation
- Study mode cards: large visual, last session info, subject progress, quick start button
- Weekly leaderboard preview: top 3 podium + student's own position
- Subject performance: bar charts with mastery colors, click → Topic Drill
- Study hall widget: hall name, position, points to next promotion, days remaining
- Quick actions: resume last session, daily challenge
- Trial banner: countdown to expiry, upgrade CTA
- Skeleton loading screens for all data sections

---

### 3. Full Frontend Retouch — All Pages

Every page gets: consistent SVG icons, mobile-first layout, animations, skeleton loading, empty states, error/success states.

Pages: login.html, signup.html, profile-setup.html, performance.html, topic-drill.html, flash-cbt.html, year-vault.html, speed-burst.html, speed-results.html, battle.html + all battle pages, results.html, leaderboard.html, profile.html, notifications.html, blog.html, how-it-works.html, custom-setup.html + all admin pages

---

### 4. All 5 Study Modes — Maximum Potential Overhaul

**Flash CBT:**
- Pre-exam screen with subject breakdown and tips
- Question palette for navigation, flag/bookmark questions
- Time warning animation <5 mins (red pulse)
- Auto-save progress every 30s
- Post-exam: animated score reveal, subject breakdown, weak areas, links to Topic Drill

**Topic Drill:**
- Topic selection grid with mastery color per topic
- Full-screen question card layout with large tap targets
- Immediate feedback: green/red flash + explanation slides in
- Session summary: accuracy, time, mastery change
- Resume where you left off

**Year Vault:**
- Visual timeline year grid with score badges on completed years
- Pre-exam: cut-off mark info card
- Results: score vs cut-off, pass/fail, comparison to past attempts
- Progress timeline showing all years

**Speed Burst:**
- 3-2-1 animated countdown before start (Disney anticipation principle)
- Circular progress ring per question, turns red in last 10 seconds
- Instant question transitions (no delay)
- End screen: speed score, accuracy, shareable result card with WhatsApp/Twitter share
- Speed leaderboard

**Battle Mode:**
- Animated waiting screen with opponent avatar
- Live split-screen: both players' progress in real-time via WebSocket
- Lead/lag indicator: "You're ahead by 2"
- Dramatic score reveal animation on finish
- AI opponent: Easy/Medium/Hard with visible thinking indicator
- Async battles: clear status indicators
- Battle history: win/loss record, rank progression chart

---

### 5. Blog — Maximum Quality

**Homepage blog section:**
- Featured post: large hero card with cover image, category badge, excerpt, read time
- 3 recent posts grid with preview images
- Category filter tabs: All, JAMB, WAEC, Post-UTME, Scholarships, Study Tips, Student Life, Nigerian Education, Opportunities Abroad
- Hover: card lift + image zoom

**blog.html:**
- Search bar hero
- Category filter (sidebar desktop / tabs mobile)
- Post cards: cover image, category, title, excerpt, author, date, read time, views
- Featured/pinned posts at top

**blog-post.html:**
- Full cover image header
- Author, date, read time, view count
- Rich typography for content
- Social share: Twitter, WhatsApp, copy link
- Related posts (3 cards)

**admin/blog.html:**
- Rich text editor (Quill.js)
- Cover image upload
- Category, tags, SEO fields (meta title, description, slug)
- Draft/publish toggle
- Preview before publish
- AI generator: placeholder button only (not implemented yet)

---

### 6. Year Vault Question Bank

Write Python scripts — same format as topic drill but `year` field set.
Target: ~6 years × 19 subjects × ~40 questions = ~4,560 questions
Save to `/Users/mac/Downloads/`
DB: `postgresql://postgres:gSnphLEefUipyLfECuyOgjRlyShUtCeu@zephyr.proxy.rlwy.net:34397/railway?sslmode=require`

---

### 7. Bug Fixes

Systematic check of entire platform. Use debugging-code skill immediately on any error.
Areas: login/signup, all 5 modes, results, leaderboard, notifications, profile, admin CRUD

---

### 8. Test All Modes End to End

Complete full sessions as real student. Use webapp-testing skill.

---

### 9. New Pages to Build

- **study-hall.html** — weekly standings, promotion/relegation zones
- **study-modes.html** — all 5 modes hub
- **admin/questions-import.html** — bulk import panel
- **about.html** — founder story, mission (details TBD later)
- **privacy-policy.html** — Nigerian law (details TBD later)
- **terms.html** — terms of service
- **contact.html** — form + social links (handles TBD)

Social platforms (placeholder href="#" for now): Instagram, Twitter/X, TikTok, WhatsApp, YouTube

---

### 10. Google OAuth

Currently "Coming Soon" toast on signup.html. DO NOT implement until explicitly told.

---

### 11. Paystack Integration

Wire subscription page. Webhook MUST verify HMAC-SHA512 before activating subscription.

---

### 12. SEO + Security Audit

claude-seo on homepage and blog. Shannon pentest before launch.

---

## ABSOLUTE RULES — NEVER BREAK

1. Frontend = pure HTML/CSS/Vanilla JS — no frameworks ever
2. Never modify HTML structure — only add JS inside existing `<script>` tags
3. JWT in httpOnly cookies only — never localStorage
4. All fetch: `credentials: 'include'`
5. No emojis — SVG icons only
6. No fake data — empty states only
7. Admin auth separate from student auth
8. Paystack webhook: verify HMAC-SHA512 first
9. Google sign-in = Coming Soon only
10. `glossary` NEVER in Question INSERTs
11. `ON CONFLICT DO NOTHING` on all imports
12. Trial: "3-day free trial" or "72-hour trial"
13. Subscription: "valid until your exam is written. No recurring charges."
14. Legal: "Prezidox Academy is not affiliated with UNILAG, OAU, JAMB, WAEC, NECO, or JUPEB."
15. All dates: 2026
16. One task at a time — complete fully before next

---

## BRAND

```css
--navy: #0B1F3A | --gold: #E5A100 | --off-white: #F9F8F5
--navy-mid: #132c52 | --gold-bright: #F5B800 | --gray-100: #ECEAE5
--navy-light: #1e3f6e | --gold-deep: #C48900 | --gray-400: #9B9790
--gold-pale: #FFF8E6 | --green: #18A34A | --red: #DC2626 | --border: #E4E1DC
```
Headings: `DM Serif Display` | Body: `Inter`

---

## DATABASE

```
postgresql://postgres:gSnphLEefUipyLfECuyOgjRlyShUtCeu@zephyr.proxy.rlwy.net:34397/railway?sslmode=require
```

19 subjects (exact): Mathematics, Chemistry, Physics, Biology, Economics, Government, Geography, General Knowledge, Accounts, Literature in English, Computer Science, Further Mathematics, Agricultural Science, Commerce, History, Christian Religious Studies, Islamic Religious Studies, French, Use of English

Rules: `glossary` never in INSERTs | `id` = `'q_'` + 10 alphanumeric | `year` = NULL (topic drill) or SET (year vault) | `category` = always `'unilag'`

---

## SUBSCRIPTIONS

UNILAG ₦4,500 | OAU ₦4,500 | Bundle ₦8,500 | Trial: 72 hours

---

## VERIFY DB ON START

```bash
PGPASSWORD=gSnphLEefUipyLfECuyOgjRlyShUtCeu psql "postgresql://postgres:gSnphLEefUipyLfECuyOgjRlyShUtCeu@zephyr.proxy.rlwy.net:34397/railway?sslmode=require" -c "SELECT subject, COUNT(*) FROM \"Question\" GROUP BY subject ORDER BY subject;"
```
