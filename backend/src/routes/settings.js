const router = require('express').Router();
const prisma = require('../utils/prisma');

const DEFAULT_SETTINGS = {
  trialDurationHours: 72,
  maintenanceMode: false,
  announcementBanner: '',
  subscriptionPrices: { unilag: 4500, oau: 4500, bundle: 8500 },
  subscriptionExpiry: { unilag: '2026-12-31', oau: '2026-12-31', bundle: '2026-12-31' },
  categoryStatus: { unilag: 'active', oau: 'active', jamb: 'coming_soon', waec: 'coming_soon', neco: 'coming_soon', jupeb: 'coming_soon' },
  promoCode: null,
  promoDiscount: 0,
  promoExpiry: null,
  promoMaxUses: null,
  promoUsedCount: 0,
};

async function getSettings() {
  try {
    const rows = await prisma.platformSetting.findMany();
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach(r => {
      try { settings[r.key] = typeof r.value === 'object' ? r.value : r.value; } catch(e) {}
    });
    return settings;
  } catch(e) { return DEFAULT_SETTINGS; }
}

// GET /api/settings/public — public settings for frontend
router.get('/public', async (req, res) => {
  try {
    const s = await getSettings();
    res.json({
      announcementBanner: s.announcementBanner || '',
      maintenanceMode: s.maintenanceMode || false,
      subscriptionPrices: s.subscriptionPrices || DEFAULT_SETTINGS.subscriptionPrices,
      subscriptionExpiry: s.subscriptionExpiry || DEFAULT_SETTINGS.subscriptionExpiry,
      categoryStatus: s.categoryStatus || DEFAULT_SETTINGS.categoryStatus,
      promoCode: s.promoCode || null,
      promoDiscount: s.promoDiscount || 0,
      promoExpiry: s.promoExpiry || null,
    });
  } catch(e) { res.json(DEFAULT_SETTINGS); }
});

// POST /api/settings/validate-promo — validate promo code
router.post('/validate-promo', async (req, res) => {
  try {
    const { code } = req.body;
    const s = await getSettings();
    if (!s.promoCode || !code) return res.json({ valid: false, message: 'No promo code active.' });
    if (String(s.promoCode).toUpperCase() !== String(code).toUpperCase()) {
      return res.json({ valid: false, message: 'Invalid promo code.' });
    }
    if (s.promoExpiry && new Date(s.promoExpiry) < new Date()) {
      return res.json({ valid: false, message: 'Promo code has expired.' });
    }
    if (s.promoMaxUses && s.promoUsedCount >= s.promoMaxUses) {
      return res.json({ valid: false, message: 'Promo code has reached its usage limit.' });
    }
    res.json({ valid: true, discount: s.promoDiscount || 0, message: `${s.promoDiscount}% discount applied!` });
  } catch(e) { res.json({ valid: false, message: 'Error validating code.' }); }
});

module.exports = router;
module.exports.getSettings = getSettings;
