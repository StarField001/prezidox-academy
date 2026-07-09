const router  = require('express').Router();
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const prisma  = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { getPlan, initializeTransaction, verifyTransaction, verifyWebhookSignature } = require('../services/paystack');
const emailService = require('../services/email');

// ─── INITIALIZE PAYMENT ───────────────────────────────
router.post('/initialize', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const { plan } = req.body;
    const planConfig = getPlan(plan);

    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    // Check if already subscribed
    const existing = req.user.subscription;
    if (existing && existing.status === 'active' && existing.expiresAt > new Date()) {
      return res.status(400).json({ error: 'You already have an active subscription.' });
    }

    const reference = `pzx_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const callbackUrl = `${process.env.APP_URL}/api/payments/callback?ref=${reference}`;

    const response = await initializeTransaction({
      email:       req.user.email,
      amount:      planConfig.amount,
      reference,
      callbackUrl,
      metadata: {
        userId:    req.user.id,
        plan,
        planName:  planConfig.name,
      },
    });

    if (!response.status) {
      return res.status(500).json({ error: 'Failed to initialize payment. Please try again.' });
    }

    res.json({
      authorizationUrl: response.data.authorization_url,
      reference:        response.data.reference,
      publicKey:        process.env.PAYSTACK_PUBLIC_KEY,
      email:            req.user.email,
      amount:           planConfig.amount,
      plan,
      planName:         planConfig.name,
    });
  } catch (err) { next(err); }
});

// ─── PAYMENT CALLBACK (redirect from Paystack) ────────
router.get('/callback', async (req, res, next) => {
  try {
    const { ref } = req.query;
    if (!ref) return res.redirect('/subscription.html?status=failed');

    const response = await verifyTransaction(ref);
    if (!response.status || response.data.status !== 'success') {
      return res.redirect('/subscription.html?status=failed');
    }

    await activateSubscription(response.data);
    res.redirect('/dashboard.html?subscribed=1');
  } catch (err) {
    console.error('Payment callback error:', err);
    res.redirect('/subscription.html?status=error');
  }
});

// ─── PAYSTACK WEBHOOK ─────────────────────────────────
// Raw body required for signature verification (captured via express.json verify hook)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature.' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      await activateSubscription(event.data);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ received: true }); // always 200 to Paystack
  }
});

// ─── MANUAL VERIFY (fallback) ─────────────────────────
router.get('/verify/:ref', requireAuth, async (req, res, next) => {
  try {
    const response = await verifyTransaction(req.params.ref);
    if (!response.status || response.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful.' });
    }

    await activateSubscription(response.data);
    res.json({ message: 'Payment verified and subscription activated.' });
  } catch (err) { next(err); }
});

// ─── SUBSCRIPTION STATUS ──────────────────────────────
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const sub  = req.user.subscription;
    const now  = new Date();
    const trialActive = req.user.trialExpiresAt && req.user.trialExpiresAt > now;
    const subActive   = sub && sub.status === 'active' && sub.expiresAt > now;

    res.json({
      hasAccess:   trialActive || subActive,
      trialActive,
      trialExpiresAt: req.user.trialExpiresAt,
      subscription:   sub || null,
      subscriptionActive: subActive,
    });
  } catch (err) { next(err); }
});

// ─── ACTIVATE SUBSCRIPTION HELPER ────────────────────
async function activateSubscription(paystackData) {
  const { metadata, reference, amount } = paystackData;
  const { userId, plan } = metadata;

  if (!userId || !plan) throw new Error('Missing metadata in Paystack response');

  const planConfig = getPlan(plan);
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

  const sub = await prisma.subscription.upsert({
    where:  { userId },
    update: {
      plan,
      status:     'active',
      paystackRef: reference,
      amountPaid: amount,
      paidAt:     new Date(),
      expiresAt:  new Date(planConfig.expiresAt),
    },
    create: {
      userId,
      plan,
      status:     'active',
      paystackRef: reference,
      amountPaid: amount,
      paidAt:     new Date(),
      expiresAt:  new Date(planConfig.expiresAt),
    },
    include: { user: true },
  });

  emailService.sendSubscriptionConfirmEmail(sub.user, sub);
  return sub;
}

// Raw body parser for webhook
function express_raw() {
  return require('express').raw({ type: 'application/json' });
}

module.exports = router;
