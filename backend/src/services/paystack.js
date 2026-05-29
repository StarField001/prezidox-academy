const https = require('https');
const crypto = require('crypto');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// ─── PLAN CONFIG ──────────────────────────────────────
const PLANS = {
  unilag: {
    name:      'UNILAG Post-UTME 2026',
    amount:    450000, // in kobo (₦4,500)
    expiresAt: process.env.UNILAG_2026_EXPIRY || '2026-12-31T23:59:59Z',
  },
  oau: {
    name:      'OAU Post-UTME 2026',
    amount:    450000,
    expiresAt: process.env.OAU_2026_EXPIRY || '2026-12-31T23:59:59Z',
  },
  bundle: {
    name:      'All Exams 2026 Bundle',
    amount:    850000, // ₦8,500
    expiresAt: process.env.BUNDLE_2026_EXPIRY || '2026-12-31T23:59:59Z',
  },
};

function getPlan(planId) {
  return PLANS[planId] || null;
}

// ─── INITIALIZE TRANSACTION ───────────────────────────
async function initializeTransaction({ email, amount, reference, metadata, callbackUrl }) {
  const body = JSON.stringify({
    email,
    amount,
    reference,
    metadata,
    callback_url: callbackUrl,
  });

  return paystackRequest('POST', '/transaction/initialize', body);
}

// ─── VERIFY TRANSACTION ───────────────────────────────
async function verifyTransaction(reference) {
  return paystackRequest('GET', `/transaction/verify/${reference}`);
}

// ─── VERIFY WEBHOOK SIGNATURE ─────────────────────────
function verifyWebhookSignature(body, signature) {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return hash === signature;
}

// ─── HTTP HELPER ──────────────────────────────────────
function paystackRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port:     443,
      path,
      method,
      headers: {
        Authorization:  `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid Paystack response')); }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = { PLANS, getPlan, initializeTransaction, verifyTransaction, verifyWebhookSignature };
