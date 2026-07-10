# PREZIDOX ACADEMY — CLAUDE CODE MASTER INSTRUCTIONS
> Read this entire file before doing anything in every session.
> This is a live production platform. Real users will use this.

---

## MODEL SWITCHING RULES — FOLLOW STRICTLY

You are responsible for telling the user when to switch models. Do this proactively — do not wait to be asked.

### When to use each model:

| Model | Use for |
|-------|---------|
| **Fable 5** | Homepage rebuild, dashboard retouch, all mode overhauls, complex architecture, multi-file refactors, planning entire features, root cause debugging across many files |
| **Opus 4.8** | Building individual pages, fixing bugs, writing backend routes, implementing planned features, question bank scripts |
| **Sonnet 4.6** | Reading files, small edits under 20 lines, running scripts, checking output, answering questions |

### How to tell the user to switch:

Say this at the START of your response — before doing anything else:

> **⚡ SWITCH MODEL NOW: [MODEL NAME]**
> Reason: [one line]
> In Claude Code: type `/model [fable/opus/sonnet]` then press Enter, then re-send your last message.

### Switching triggers:

**SWITCH TO FABLE 5** when:
- Starting homepage, dashboard, or any mode overhaul
- Planning any feature touching 5+ files
- Stuck on a bug after 2 attempts
- Making architecture decisions

**SWITCH TO OPUS 4.8** when:
- Fable has finished planning, implementation begins
- Building a new page or backend route
- Fixing a bug with clear root cause
- Running question bank import scripts

**SWITCH TO SONNET 4.6** when:
- Reading and summarizing files
- Making a single small edit
- Running terminal commands
- Quick questions

---

## INSTALLED SKILLS — USE AUTOMATICALLY

| Skill | Trigger automatically when... |
|-------|------------------------------|
| **impeccable** | After EVERY HTML/CSS file edit |
| **frontend-design** | Before any UI/frontend work |
| **animation-principles** | Any animation, transition, micro-interaction, countdown |
| **ui-ux-pro-max** | Designing or retouching any page |
| **webapp-testing** | After any page is built or fixed |
| **a11y-skill** | After any page is polished |
| **prisma-cli** | Any Prisma CLI command |
| **prisma-client-api** | Any DB query or Prisma operation |
| **prisma-database-setup** | Any DB connection or config work |
| **debugging-code** | The MOMENT any error or bug appears |
| **claude-seo** | On index.html and blog.html before launch |
| **shannon** | Before ANY production deployment |
| **excalidraw-diagram** | Planning architecture or user flows |
| **seo-geo** | Keyword research for homepage |

Do NOT wait to be asked. If the task matches, use the skill.

---

## WHAT THIS PROJECT IS

Prezidox Academy — Nigerian CBT exam prep platform for UNILAG Post-UTME and OAU Post-UTME students.

- **Live URL:** https://prezidox-academy-production.up.railway.app
- **GitHub:** https://github.com/StarField001/prezidox-academy
- **Stack:** Node.js + Express + Prisma ORM + PostgreSQL (Railway) + Socket.io + SendGrid
- **Frontend:** Pure HTML + CSS + Vanilla JS — NEVER use React, Vue, or any framework

---

## DATABASE

```
postgresql://postgres:gSnphLEefUipyLfECuyOgjRlyShUtCeu@zephyr.proxy.rlwy.net:34397/railway?sslmode=require
```

**19 Subject Names (exact spelling — critical):**
```
Mathematics, Chemistry, Physics, Biology, Economics, Government,
Geography, General Knowledge, Accounts, Literature in English,
Computer Science, Further Mathematics, Agricultural Science,
Commerce, History, Christian Religious Studies,
Islamic Religious Studies, French, Use of English
```

---

## BRAND DESIGN SYSTEM

```css
--navy:        #0B1F3A
--navy-mid:    #132c52
--navy-light:  #1e3f6e
--gold:        #E5A100
--gold-bright: #F5B800
--gold-deep:   #C48900
--gold-pale:   #FFF8E6
--off-white:   #F9F8F5
--gray-50:     #F5F4F1
--gray-100:    #ECEAE5
--gray-200:    #D8D5CE
--gray-400:    #9B9790
--gray-600:    #5C5854
--gray-800:    #2E2C29
--border:      #E4E1DC
--green:       #18A34A
--red:         #DC2626
--amber:       #D97706
```

Headings: `DM Serif Display` | Body: `Inter` | Icons: SVG only — NO emojis

---

## FRONTEND RETOUCH STANDARDS
Apply to EVERY page:

### Animations & Micro-interactions
- Every button: hover lift + shadow transition (transform: translateY(-2px))
- Cards: hover elevation effect
- Page load: staggered fade-in for content blocks
- Stats/numbers: count-up animation on first view (IntersectionObserver)
- Progress bars: animated fill on load
- Toast: slide-in from top-right, auto-dismiss
- Modal: scale-in + backdrop blur
- Loading: skeleton screens matching real content layout (never spinners)
- Empty states: illustrated SVG + clear CTA button
- Error states: red border + inline helper text
- Success states: green checkmark + confirmation

### Icons
- Single consistent SVG icon set throughout entire platform
- Sizes: 16px inline, 20px buttons, 24px nav, 32px feature cards, 48px empty states
- Stroke weight: 1.5px consistent everywhere
- Never mix icon styles

### Mobile-First Rules
- Every page designed at 360px first, then scale up
- Touch targets: minimum 44×44px
- Bottom nav bar on mobile
- No horizontal scroll anywhere
- Font: minimum 14px body, 16px inputs (prevents iOS zoom)
- Tap highlight states on all interactive elements

---

## STUDY MODES — MAXIMUM POTENTIAL SPEC

Every mode must reach maximum UI/UX quality, student experience, and functionality.

### Flash CBT
- Pre-exam screen: subject breakdown, estimated time, tips
- During exam: smooth question transitions (slide animation), question palette for navigation, flag/bookmark questions, time warning animation when <5 mins remain (red pulse)
- Auto-save progress every 30 seconds (resume if tab closes)
- Post-exam: animated score reveal, detailed breakdown by subject and topic, comparison to average score, weak areas highlighted, direct links to Topic Drill for weak subjects

### Topic Drill
- Subject → topic selection: visual card grid with mastery color indicator per topic (not started/learning/improving/mastered)
- Question card: clean full-screen card layout, options as large tap targets
- Immediate feedback: correct = green flash + explanation slides in, wrong = red flash + correct answer highlighted + explanation
- Streak counter within session
- Exit summary: questions answered, accuracy, time spent, mastery level change
- Continue where you left off prompt

### Year Vault
- Year selection: visual timeline grid, completed years show score badge, locked years greyed out
- Pre-exam: year info card showing that year's cut-off mark
- During exam: same polish as Flash CBT
- Results: your score vs cut-off mark, pass/fail indication, comparison to past attempts
- Progress map: all years with scores shown on a timeline

### Speed Burst
- Countdown before start: 3-2-1 animated countdown (Disney animation principles — anticipation)
- Per-question timer: circular progress ring that turns red in last 10 seconds
- Question transitions: instant snap (no delay — speed is the point)
- Auto-advance with brief flash of correct/wrong answer
- End screen: speed score, accuracy, streak, shareable result card with WhatsApp/Twitter share
- Leaderboard: top speed scores that session

### Battle Mode
- Pre-battle: animated waiting screen with opponent avatar, ping indicator
- Live battle: split-screen showing both players' progress in real-time
- Question answered: instant feedback + opponent progress update via WebSocket
- Lead/lag indicator: "You're ahead by 2" / "Opponent is ahead by 1"
- Final reveal: dramatic score reveal animation, winner badge, XP gained
- AI opponent: difficulty levels (Easy/Medium/Hard) with visible AI thinking indicator
- Async battles: clear status indicators (waiting/in-progress/completed)
- Battle history: win/loss record, subject breakdown, rank progression chart

---

## DASHBOARD — EXPERT RETOUCH SPEC

- Hero greeting: "Good morning, [Name]" + rank badge + streak flame
- 4 stat cards: glassmorphism on navy (points, rank, streak, sessions) with count-up animation
- Study modes: large visual cards, last session info, subject progress bar, quick start button
- Weekly leaderboard: top 3 podium + student's own position highlighted gold
- Subject performance: horizontal bars with mastery color coding, clickable → topic drill
- Study hall widget: current hall, position, points to next promotion, days left
- Quick actions: resume last session, daily challenge CTA
- Trial/subscription banner: prominent but non-intrusive, countdown to expiry
- Skeleton loading screens for all data sections
- All real data — zero placeholders

---

## BLOG SPEC

### Homepage Blog Section
- Featured post: large hero card with full cover image, title, category badge, excerpt, read time, date
- Recent posts grid: 3 cards with preview images, category, title, excerpt, author, date
- Category filter tabs: All, JAMB, WAEC, Post-UTME, Scholarships, Student Life, Study Tips, Nigerian Education, Opportunities
- "View all posts" CTA button
- Hover: card lift + image zoom effect

### Blog Listing Page (blog.html)
- Hero with search bar
- Category filter sidebar (desktop) / horizontal scroll tabs (mobile)
- Post cards: cover image, category badge, title, excerpt, author avatar, date, read time, view count
- Pagination or infinite scroll
- Featured/pinned posts at top
- Empty state for no results

### Individual Blog Post Page (blog-post.html)
- Full cover image header
- Author info: name, avatar, date, read time, view count
- Rich text content with proper typography
- Category + tags
- Social share buttons (Twitter, WhatsApp, copy link)
- Related posts at bottom (3 cards)
- Back to blog button

### Blog Admin (admin/blog.html)
- Create/edit posts with rich text editor (Quill.js or similar)
- Cover image upload
- Category selection
- SEO fields: meta title, meta description, slug
- Draft/publish toggle
- Preview before publish
- Future: AI content generator (not yet — placeholder button only)

---

## NEW PAGES TO BUILD

### Pages Needed (build after main retouch):
1. **study-hall.html** — Weekly study hall standings, promotion/relegation zones
2. **study-modes.html** — Hub showing all 5 modes with descriptions
3. **admin/questions-import.html** — Bulk question import panel
4. **about.html** — To be detailed later (founder story, mission, team)
5. **privacy-policy.html** — To be detailed later (Nigerian law, informal business)
6. **terms.html** — Terms of service
7. **contact.html** — Contact form + social links (to be added later)

### Social Links (placeholders for now):
Add social icon links in footer but set href="#" until handles are provided.
Platforms: Instagram, Twitter/X, TikTok, WhatsApp, YouTube

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
9. Google sign-in = Coming Soon only — DO NOT implement
10. `glossary` NEVER in Question INSERTs
11. `ON CONFLICT DO NOTHING` on all imports
12. Trial: "2-day free trial" or "48-hour trial" (changed from 72h on 2026-07-09)
13. Subscription: "valid until your exam is written. No recurring charges."
14. Legal: "Prezidox Academy is not affiliated with UNILAG, OAU, JAMB, WAEC, NECO, or JUPEB."
15. All dates: 2026
16. One task at a time — complete fully before next

---

## SUBSCRIPTION PLANS

| Plan | Price |
|------|-------|
| UNILAG Post-UTME 2026 | ₦4,500 one-time |
| OAU Post-UTME 2026 | ₦4,500 one-time |
| All Exams 2026 Bundle | ₦8,500 one-time |

Trial: 48 hours from first login, all modes unlocked.

---

## EXAM FORMATS

| Mode | Questions | Time |
|------|-----------|------|
| UNILAG Flash CBT | 40 | 30 mins |
| OAU Flash CBT | 40 | 60 mins (4 sections) |
| Topic Drill | Unlimited | Optional timer |
| Year Vault | 40 | Real year format |
| Speed Burst | 20 | 30 secs/question |
| Battle | 10/20/30 | No overall timer |

---

## RANKING SYSTEM

**Academic:** Freshman (0) → Scholar (500) → Achiever (1,500) → Honours (3,500) → Merit (7,000) → Distinction (13,000) → Excellence (22,000) → Valedictorian (35,000) → Summa (55,000) → Legend (80,000+)

**Battle:** Recruit → Challenger → Fighter → Veteran → Commander → Warlord

**Study Halls:** First Class → Second Class Upper → Second Class Lower → Third Class → Pass → Probation

**Points:** Correct answer +5 | Flash CBT +10 | Battle win +50 | Streak Day 7 +75 | Day 30 +300

---

## QUESTION BANK STATUS

- ✅ All 19 subjects fully imported into Railway DB for Topic Drill
- ⏳ Year Vault questions — NOT YET WRITTEN

---

## PENDING TASKS (in order)

1. ✅ Topic Drill question bank — COMPLETE
2. **Homepage rebuild** — START HERE
3. **Dashboard expert retouch**
4. **Full frontend retouch** — all 25 student + 7 admin pages
5. **All 5 study modes** — maximum potential overhaul
6. **Blog** — homepage section + blog.html + blog-post.html + admin/blog.html
7. Year Vault question bank
8. Bug fixes
9. Test all modes end to end
10. New pages: study-hall, study-modes, admin/questions-import, about, privacy-policy, terms, contact
11. Google OAuth — when explicitly instructed
12. Paystack integration
13. SEO + security audit

---

## QUESTION BANK RULES

- `glossary`: NEVER in INSERTs
- `id`: `'q_'` + 10 random alphanumeric
- `year`: NULL for topic drill, SET for year vault
- `category`: always `'unilag'`
- `ON CONFLICT DO NOTHING` on every INSERT
- Max 50 per `run_batch()`
- Answer: ~25% per letter | Difficulty: ~40/40/20 easy/medium/hard
- Every question needs a non-empty explanation

---

## IF UNSURE

Read HANDOVER.md. Ask before any decision affecting architecture or deleting data.
