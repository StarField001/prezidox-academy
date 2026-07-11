# Google AdSense — Complete Setup & Approval Guide (Prezidox Academy)

> **Status: NOT integrated yet.** This is a preparation guide only. No ad code has been added to the site.
> When you are ready, complete Steps 1–7 below, then send me the items in **Section 9** and I will wire everything in.

---

## 1. What AdSense is and how you get paid

Google AdSense places ads on your pages and pays you when visitors see or click them. You earn per 1,000 impressions (RPM) and per click (CPC). Nigerian education traffic typically earns modestly but steadily; the money grows with traffic volume.

You need:
- A live website with real, original content (you have this ✅)
- A Google account (use `starfieldtech946@gmail.com` or a dedicated business Gmail)
- A way to receive payment (bank account + address for the PIN letter)

---

## 2. Eligibility requirements (check BEFORE applying)

Google reviews the whole site manually. You must have:

1. **You are 18+** (or have an adult receive payments).
2. **Original, valuable content** — your blog posts and study material qualify. Thin or copied content = rejection.
3. **Enough content** — aim for **20–30+ substantial pages/posts** before applying. Your 20 seeded blog posts + homepage + mode pages meet this. Do NOT apply with an empty blog.
4. **Required legal/info pages, all reachable from the footer:**
   - Privacy Policy ✅ (`privacy-policy.html`)
   - Terms of Service ✅ (`terms.html`)
   - Contact page ✅ (`contact.html`)
   - About page ✅ (`about.html`)
   - The Privacy Policy **must mention that third parties (Google) use cookies to serve ads** — I will add this clause when we integrate.
5. **Clean navigation** — every page reachable, no broken links, no "under construction" pages.
6. **A custom domain** — `prezidoxacademy.com` is strongly preferred over the `railway.app` subdomain. Apply with the custom domain connected.
7. **Site loads fast and is mobile-friendly** ✅ (already true).
8. **No prohibited content** — nothing adult, violent, or copyright-infringing. Exam-prep is fully allowed.

---

## 3. Prepare the site for approval (do this first)

- [ ] Custom domain `prezidoxacademy.com` live and set as canonical.
- [ ] Blog seeded with the 20 posts (run the seed — see below) and published.
- [ ] Privacy Policy, Terms, Contact, About all linked in the footer of every page.
- [ ] No placeholder / "coming soon" pages indexed. If a page isn't ready, `noindex` it.
- [ ] `sitemap.xml` and `robots.txt` present and correct ✅ (already deployed).
- [ ] Site verified in **Google Search Console** (helps AdSense trust the site).

**To seed the blog posts:** log into Admin → Blog and use the "Seed sample posts" action, or run on the server:
```bash
cd backend && node prisma/seedBlog.js
```

---

## 4. Create your AdSense account

1. Go to **https://adsense.google.com** → **Get started**.
2. Sign in with your Google account.
3. Enter your website URL: `https://prezidoxacademy.com`.
4. Select **country: Nigeria** and your payment currency (USD is standard; payout converts to your bank).
5. Accept the AdSense Terms.
6. Google gives you an **AdSense code snippet** (a `<script>` tag with your Publisher ID `ca-pub-XXXXXXXXXXXXXXXX`). **Save this — you'll send it to me (Section 9).**

---

## 5. Connect the site for review

Google needs to confirm you own the site. You'll be asked to do ONE of:
- **Paste the AdSense snippet** into the `<head>` of every page (I do this for you — just send me the snippet), **or**
- **Add an `ads.txt` file** at the site root, **or**
- Use the **Site Kit by Google** method.

We'll use the head-snippet method. Once it's live on the site, click **"I've placed the code"** / **Request review** in AdSense.

---

## 6. The review wait

- Review takes **a few days to ~2 weeks**.
- Keep the site live and unchanged during review. Don't take pages down.
- Approval email → you can start showing ads. Rejection email → it states the reason (usually "insufficient content" or "site not ready"); fix and re-apply.

---

## 7. Payment setup (after approval)

1. In AdSense → **Payments**, add your **name and address exactly** (this is where the PIN verification letter is mailed).
2. At **$10 earned**, Google mails a **PIN** to that address — enter it in AdSense to verify.
3. Add your **Nigerian bank account** (or a supported payment method). AdSense pays via bank transfer for Nigeria.
4. **Payment threshold is $100** — you get paid once your balance passes it, around the 21st of the month.

---

## 8. Recommended ad placements & formats (for when we integrate)

I'll implement these to balance revenue against your clean navy/gold design. AdSense **Auto Ads** is the easy option, but manual placement looks more professional. Recommended manual units:

| Location | Placement | Format |
|---|---|---|
| **Homepage** | One unit below the hero / between the mode grid and blog section | Responsive display (in-feed) |
| **Blog listing (`blog.html`)** | One in-feed unit after every 4–6 post cards | In-feed / responsive |
| **Individual post (`blog-post.html`)** | One after the intro, one mid-article, one below the article before related posts | In-article + responsive display |
| **Sidebar (desktop blog)** | One sticky unit | 300×250 or responsive |

**Formats to use:** Responsive display ads (auto-resize), In-article, and In-feed. Avoid fixed large units that break mobile.

**Do NOT place ads on:** login, signup, payment, dashboard, or inside active exam/study modes — ads during a timed CBT hurt UX and can violate policy (accidental clicks).

---

## 9. Policy rules — do NOT violate these (account ban risk)

- **Never click your own ads** or ask friends/students to click them. Google detects this instantly → permanent ban.
- **No "click here" / "support us by clicking ads"** language near ads.
- **Max clarity** — ads must be clearly distinguishable from your content and navigation. Don't place an ad right beside a button so people misclick.
- **No ads on error pages, thank-you-only pages, or pages with no content.**
- **Don't put ads inside pop-ups or auto-refreshing pages.**
- Keep content family-safe (exam prep is fine).
- One AdSense account per person. Don't create multiple.

---

## 10. What to send me to integrate (checklist)

When approved (or when you want the code placed for review), send me:

1. ✅ **Your AdSense head snippet** — the full `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" ...></script>` line.
2. ✅ **Your Publisher ID** (`ca-pub-XXXXXXXXXXXXXXXX`).
3. ✅ **Ad unit slot IDs** if you create manual units (each unit gives a `data-ad-slot="1234567890"` number). If you prefer, I can set up **Auto Ads** and you won't need slot IDs.
4. ✅ Confirmation of whether you want **Auto Ads** (Google decides placement) or **manual placements** (I place them per Section 8).
5. ✅ Confirm the **canonical domain** to use (`prezidoxacademy.com`).

Once I have those, I will: add the head snippet site-wide, add the ad-cookie clause to the Privacy Policy, insert the ad units in the approved locations only, add an `ads.txt`, and deploy.
