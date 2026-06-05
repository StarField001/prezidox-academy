# TASK PLAN — Prezidox Academy Dashboard & Profile Updates

## Information Gathered

### File 1: public/dashboard.html
- Full dashboard page with sidebar, topbar, greeting, trial banner, subjects, stats, modes, OAU section, study hall widget, recent sessions, and right column cards
- Contains CATS object with exam categories: unilag, oau, jamb, waec, neco
- Has initDashboard() function that renders all dashboard sections
- Contains functions: renderRankCard(), renderHallCard(), renderBattleCard(), renderStreakCard(), renderMasteryBadges()
- RANK_TIERS array exists (referenced in task as needing removal)
- getRankInfo function exists (needs removal)

### File 2: public/profile.html
- Basic profile page with sidebar, topbar, profile header, personal info card, change password card, danger zone card
- Uses PX.get() from api.js for data fetching
- Topbar avatar has initials "AO" hardcoded
- Sidebar avatar has initials "AO" hardcoded

### File 3: public/js/api.js
- Simple API wrapper with get, post, patch, del, adminGet, adminPost, adminPatch, adminDel methods
- Toast utility function included

---

## PLAN

### TASK 1 — FIX public/dashboard.html

1. **Change topbar avatar from div to anchor tag**
   - Find: `<div class="topbar-av" id="topAv">--</div>`
   - Change to: `<a href="profile.html" class="topbar-av" id="topAv">--</a>`

2. **Remove right column cards (keep only Exam Focus, Latest News, Leaderboard Mini)**
   - Remove: rankCard (id="rankCard")
   - Remove: hallCard (id="hallCard")
   - Remove: battleCard (id="battleCard")
   - Remove: streak (class="streak")
   - Remove: mastery-card (class="mastery-card")
   - Preserve: focus-card, news-card, panel#lbMini

3. **Add JUPEB and Undergraduate Courses to CATS object**
   - Add after neco entry:
   ```
   jupeb: { id:'jupeb', name:'JUPEB', sub:'Advanced Level · 2026', status:'coming_soon',
     logo:'https://jupeb.edu.ng/images/logo/jupebLogoSmall1.png', hasSubjFlow:false },
   undergrad: { id:'undergrad', name:'Undergraduate Courses', sub:'CCMAS · University Courses', status:'coming_soon',
     logo:'https://i.pinimg.com/736x/dc/ce/e8/dccee8e81c62d0e7c175a69500ee8ed9.jpg', hasSubjFlow:false },
   ```

4. **Remove render function calls in initDashboard()**
   - Remove: renderRankCard(academicRank)
   - Remove: renderHallCard(studyHall)
   - Remove: renderBattleCard(battleRank)
   - Remove: renderStreakCard(streak)
   - Remove: renderMasteryBadges(subjectMastery, user.selectedSubjects)
   - Keep other render calls

5. **Remove getRankInfo and RANK_TIERS**
   - Delete getRankInfo function entirely
   - Delete RANK_TIERS array if present

6. **Remove CSS for removed cards**
   - Remove: .rank-card CSS
   - Remove: .hall-card CSS
   - Remove: .battle-card CSS
   - Remove: .streak CSS
   - Remove: .mastery-card CSS

---

### TASK 2 — REBUILD public/profile.html

1. **Keep existing sections exactly:**
   - Sidebar structure
   - Topbar structure  
   - Toast system
   - Personal info card (firstName, lastName, email)
   - Change password card
   - Danger zone card

2. **Add AFTER profile header, BEFORE personal info:**

   SECTION 1 — STATS ROW (4 cards in a row)
   - Layout: grid, 4 columns on desktop, 2 on mobile
   - Cards: Exams Taken, Average Score, Current Streak, Total Points
   - Fetch from /api/dashboard

   SECTION 2 — ACADEMIC RANK CARD
   - Dark navy background (#0B1F3A)
   - Full width
   - Shows: rank name, total points, progress bar, next rank, pts to go

   SECTION 3 — STUDY HALL + BATTLE RANK (side by side)
   - Study Hall: white bg, gold border, hall info
   - Battle Rank: charcoal bg, rank info

   SECTION 4 — STREAK CARD
   - Navy background
   - Current streak large, best streak, 7-day visual

   SECTION 5 — SUBJECT MASTERY (redesigned)
   - For each subject in user.selectedSubjects
   - Subject name + mastery badge
   - Overall progress bar
   - Topic breakdown mini bars

   SECTION 6 — NOTIFICATION PREFERENCES
   - White card with toggles
   - Weekly study hall (default on)
   - Rank promotions (default on)
   - Battle challenges (default on)
   - Tournament results (default on)
   - Exam reminders (default on)
   - New blog posts (default off)
   - Platform announcements (default off)
   - AccountAction locked (cannot toggle)

3. **Technical requirements:**
   - Fetch /api/dashboard once for ranking data
   - Fetch /api/auth/me for user data
   - Fix topbar avatar: wire to user.firstName + lastName initials
   - Fix sidebar avatar: wire to user data
   - Inline SVG icons, stroke-width 1.8
   - No emojis
   - Full mobile responsive
   - Design tokens as specified

---

## Followup Steps

1. Test dashboard.html loads correctly without removed cards
2. Verify profile.html shows all new sections with real data
3. Test API calls work properly
4. Check mobile responsiveness
