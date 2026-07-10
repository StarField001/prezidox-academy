const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

const VALID_REASONS = ['incorrect_answer', 'unclear_wording', 'duplicate', 'typo', 'other'];

// POST /api/reports — a student flags a problem with a question
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { questionId, reason, comment, mode, page } = req.body || {};
    if (!reason || !VALID_REASONS.includes(String(reason))) {
      return res.status(400).json({ error: 'Please choose a valid reason.' });
    }
    try {
      await prisma.questionReport.create({
        data: {
          questionId: questionId ? String(questionId).slice(0, 64) : null,
          userId:     req.user.id,
          reason:     String(reason),
          comment:    comment ? String(comment).slice(0, 500) : null,
          mode:       mode ? String(mode).slice(0, 32) : null,
          page:       page ? String(page).slice(0, 160) : null,
        },
      });
    } catch (e) {
      // Table may not exist yet (migration pending) — degrade gracefully
      console.error('[reports] create failed:', e.message);
      return res.status(503).json({ error: 'Reporting is temporarily unavailable. Please try again shortly.' });
    }
    res.status(201).json({ message: 'Report submitted. Thank you.' });
  } catch (err) { next(err); }
});

module.exports = router;
