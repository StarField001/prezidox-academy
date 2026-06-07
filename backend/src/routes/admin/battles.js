const router = require('express').Router();
const prisma = require('../../utils/prisma');
const { requireAdmin } = require('../../middleware/adminAuth');

router.use(requireAdmin);

// GET /api/admin/battles
router.get('/', async (req, res, next) => {
  try {
    const battles = await prisma.battle.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        challenger: { select: { firstName: true, lastName: true, email: true } },
        opponent:   { select: { firstName: true, lastName: true, email: true } },
      },
    });
    res.json({ battles });
  } catch(err) { next(err); }
});

// DELETE /api/admin/battles/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.battleAnswer.deleteMany({ where: { battleId: req.params.id } });
    await prisma.battle.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch(err) { next(err); }
});

module.exports = router;
