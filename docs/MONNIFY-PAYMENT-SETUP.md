# Monnify Payment Gateway — Complete Setup Guide (Prezidox Academy)

> **Status: NOT implemented yet.** This is a preparation guide only. The site currently uses Paystack for payments; no Monnify code exists.
> When you're ready, complete Steps 1–8, then send me the credentials in **Section 10** and I will integrate Monnify (web + future mobile app) with a verified webhook.

Monnify (by Moniepoint) is a Nigerian payment gateway. It supports card payments, bank transfers, and dedicated virtual (reserved) accounts — the bank-transfer flow is popular with Nigerian students who don't use cards.

---

## 1. Before you start — what you'll need

- A valid email and phone number
- Your **BVN** (Bank Verification Number)
- A **Nigerian bank account** in your name or your business name (this is where settlements are paid)
- A government ID (NIN, driver's licence, voter's card, or international passport)
- If registered as a business: your **CAC** registration documents (optional — you can start as an individual/starter business)

---

## 2. Create your Monnify account

1. Go to **https://monnify.com** → **Sign Up** (or **https://app.monnify.com**).
2. Enter business name (`Prezidox Academy`), your email, phone, and a strong password.
3. Verify your email (click the link Monnify sends).
4. Log into the dashboard. You start in **Sandbox (Test) mode** by default — good, we build and test here first.

---

## 3. Business verification / KYC

To go live and receive real money you must complete KYC. In the dashboard → **Settings → Business/Compliance**:

1. **Business type** — choose *Registered Business* (needs CAC) or *Starter Business* (individual, BVN-based; lower limits but fast).
2. Provide:
   - BVN
   - Valid government ID (upload)
   - Business address
   - **Settlement bank account** (account number + bank; Monnify verifies the name matches)
   - For registered businesses: CAC certificate, and directors' info
3. Submit and wait for approval (usually 1–2 business days). You can build in Sandbox while waiting.

---

## 4. Get your API credentials (Sandbox first)

In the dashboard → **Settings → API Keys & Webhooks** you'll find:

- **API Key** — public-ish key, starts with `MK_TEST_...` (test) / `MK_PROD_...` (live)
- **Secret Key** — private, starts with `... ` (test/live variants) — **never expose this in frontend code**
- **Contract Code** — a numeric code identifying your Monnify contract; required on every transaction init

There are **two sets**: **Test** (Sandbox) and **Live** (Production). We integrate and test with the **Test** set, then switch to **Live** at launch.

---

## 5. Understand the payment flow (how it'll work on the site)

1. Student clicks **Pay** on `subscription.html`.
2. Our backend calls Monnify's **authenticate** endpoint (API key + secret → access token), then **initialize transaction** (amount, customer email, a unique `paymentReference`, and our `redirectUrl`). Monnify returns a **checkout URL**.
3. Student is sent to Monnify's secure checkout (card / transfer / USSD).
4. After payment, Monnify redirects the student back to our **callback/redirect URL** AND sends a server-to-server **webhook** to our backend.
5. Our backend **verifies the webhook signature** and confirms the transaction status via Monnify's **verify** endpoint before granting the subscription. **We only unlock access after server-side verification** — never trust the browser redirect alone.

This mirrors how Paystack already works on the site, so integration is straightforward.

---

## 6. Configure Webhook & Callback URLs

In dashboard → **Settings → API Keys & Webhooks**, set:

- **Webhook URL** (server-to-server notification):
  ```
  https://prezidoxacademy.com/api/payments/monnify/webhook
  ```
- **Redirect/Callback URL** (where the user's browser returns after paying):
  ```
  https://prezidoxacademy.com/payment-success.html
  ```

(For Sandbox testing you can point the webhook at your live server too, or use a tunneling URL. I'll confirm the exact paths when we build — the ones above are the intended endpoints.)

Monnify signs webhooks with your secret key (SHA-512 HMAC of the payload). Our backend will compute the same hash and reject any request that doesn't match — this blocks fake "payment succeeded" calls.

---

## 7. Switching Sandbox → Production

1. Complete KYC and get **approved**.
2. In the dashboard, toggle to **Live/Production** mode.
3. Copy the **Live** API Key, Secret Key, and Contract Code.
4. We swap the test credentials for live ones in the server environment variables (never in code).
5. Do one small **real** test transaction (e.g. ₦100 or the real plan price) end-to-end, confirm the webhook fires and access is granted, then confirm settlement lands in your bank.
6. Go live for real students.

---

## 8. Security best practices (important)

- **Secret key and API key live ONLY in server environment variables** (Railway → Variables), never in the HTML/JS, never committed to git.
- Frontend never talks to Monnify directly with secrets — it only calls **our** backend.
- **Always verify** payment server-side (webhook signature + verify endpoint) before granting a subscription.
- Use a **unique paymentReference per transaction** and store it; reject duplicates so a webhook can't be replayed to grant access twice.
- Log every payment event (init, webhook received, verified, access granted) for dispute resolution.
- Enforce HTTPS on all endpoints (already the case on Railway).
- Rotate keys if they're ever exposed.

---

## 9. Mobile app note

When the mobile app is built, it uses the **same backend endpoints** — the app calls our server to initialize a payment and opens Monnify's checkout URL in an in-app browser / SDK. You do **not** need a separate Monnify account or separate keys for the app; the same Contract Code and keys serve both web and mobile. Just tell me when the app exists and I'll expose the endpoints it needs.

---

## 10. What to send me to integrate (checklist)

When your account is set up (Sandbox is enough to start), send me — **privately, not in a public channel**:

**Test (Sandbox) set — to build & test with first:**
1. ✅ Test **API Key** (`MK_TEST_...`)
2. ✅ Test **Secret Key**
3. ✅ **Contract Code** (numeric)

**Live (Production) set — send only when KYC is approved & you're ready to launch:**
4. ✅ Live **API Key** (`MK_PROD_...`)
5. ✅ Live **Secret Key**
6. ✅ Live **Contract Code** (usually same as test, but confirm)

**Also confirm:**
7. ✅ The **settlement bank account** is verified in Monnify (so money actually reaches you).
8. ✅ Whether you want to **keep Paystack as well** (offer both) or **replace Paystack with Monnify**.
9. ✅ Your final **canonical domain** for the webhook/redirect URLs (`prezidoxacademy.com`).

Once I have the Test set, I will: add a Monnify service in the backend (authenticate → init → verify), a signed webhook handler at `/api/payments/monnify/webhook`, a Monnify button on `subscription.html`, and a `payment-success.html` confirmation flow — all tested in Sandbox before we flip to Live.

> ⚠️ **Never paste secret keys into a shared document, screenshot, or public chat.** Send them through a private channel, and I'll place them in Railway environment variables only.
