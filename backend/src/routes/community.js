const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
function nanoid(n){return Math.random().toString(36).substring(2,2+n);}

router.use(requireAuth);

const SUBJECTS = ['use-of-english','mathematics','general-knowledge','physics','chemistry','biology','economics','geography','government','history','literature','study-tips','battle-requests','exam-updates','general'];

// GET /api/community — list posts
router.get('/', async (req, res, next) => {
  try {
    const { subject, sort = 'recent', limit = 20, offset = 0 } = req.query;
    const where = {};
    if (subject && subject !== 'all') where.subject = subject;
    const orderBy = sort === 'top' ? { upvotes: 'desc' } : { createdAt: 'desc' };
    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where, orderBy,
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.communityPost.count({ where }),
    ]);
    const userIds = [...new Set(posts.map(p => p.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id:true, firstName:true, lastName:true, avatarUrl:true, points:true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const RANK_MAP = [[80000,'Legend'],[55000,'Summa'],[35000,'Valedictorian'],[22000,'Excellence'],[13000,'Distinction'],[7000,'Merit'],[3500,'Honours'],[1500,'Achiever'],[500,'Scholar'],[0,'Freshman']];
    const getR = pts => (RANK_MAP.find(([min]) => pts >= min) || [0,'Freshman'])[1];
    const upvoted = await prisma.communityUpvote.findMany({
      where: { userId: req.user.id, postId: { in: posts.map(p => p.id) } },
      select: { postId: true },
    });
    const upvotedSet = new Set(upvoted.map(u => u.postId));
    const replyCounts = await Promise.all(posts.map(p => prisma.communityReply.count({ where: { postId: p.id } })));
    const formatted = posts.map((p, i) => {
      const u = userMap[p.userId] || {};
      return {
        ...p,
        author: { name: `${u.firstName||''} ${(u.lastName||'')[0]||''}.`, avatarUrl: u.avatarUrl||null, rank: getR(u.points||0) },
        replyCount: replyCounts[i],
        hasUpvoted: upvotedSet.has(p.id),
        isOwn: p.userId === req.user.id,
      };
    });
    res.json({ posts: formatted, total, hasMore: parseInt(offset) + posts.length < total });
  } catch(err) { next(err); }
});

// POST /api/community — create post
router.post('/', async (req, res, next) => {
  try {
    const { subject, title, body } = req.body;
    if (!subject || !title || !body) return res.status(400).json({ error: 'Subject, title and body required.' });
    if (title.length > 200) return res.status(400).json({ error: 'Title too long (max 200 chars).' });
    if (body.length > 2000) return res.status(400).json({ error: 'Post too long (max 2000 chars).' });
    const post = await prisma.communityPost.create({
      data: { id: 'cp_'+nanoid(10), userId: req.user.id, subject, title: title.trim(), body: body.trim() },
    });
    res.status(201).json({ post });
  } catch(err) { next(err); }
});

// GET /api/community/:id — get post with replies
router.get('/:id', async (req, res, next) => {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const replies = await prisma.communityReply.findMany({
      where: { postId: post.id }, orderBy: { createdAt: 'asc' },
    });
    const userIds = [...new Set([post.userId, ...replies.map(r => r.userId)])];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id:true, firstName:true, lastName:true, avatarUrl:true, points:true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const RANK_MAP = [[80000,'Legend'],[55000,'Summa'],[35000,'Valedictorian'],[22000,'Excellence'],[13000,'Distinction'],[7000,'Merit'],[3500,'Honours'],[1500,'Achiever'],[500,'Scholar'],[0,'Freshman']];
    const getR = pts => (RANK_MAP.find(([min]) => pts >= min) || [0,'Freshman'])[1];
    const fmt = (obj) => { const u = userMap[obj.userId]||{}; return { ...obj, author: { name:`${u.firstName||''} ${(u.lastName||'')[0]||''}.`, avatarUrl:u.avatarUrl||null, rank:getR(u.points||0) }, isOwn: obj.userId===req.user.id }; };
    res.json({ post: fmt(post), replies: replies.map(fmt) });
  } catch(err) { next(err); }
});

// POST /api/community/:id/reply
router.post('/:id/reply', async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || body.trim().length < 3) return res.status(400).json({ error: 'Reply too short.' });
    if (body.length > 1000) return res.status(400).json({ error: 'Reply too long (max 1000 chars).' });
    const post = await prisma.communityPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const reply = await prisma.communityReply.create({
      data: { id: 'cr_'+nanoid(10), postId: req.params.id, userId: req.user.id, body: body.trim() },
    });
    res.status(201).json({ reply });
  } catch(err) { next(err); }
});

// POST /api/community/:id/upvote
router.post('/:id/upvote', async (req, res, next) => {
  try {
    const existing = await prisma.communityUpvote.findUnique({
      where: { userId_postId: { userId: req.user.id, postId: req.params.id } },
    });
    if (existing) {
      await prisma.communityUpvote.delete({ where: { id: existing.id } });
      await prisma.communityPost.update({ where: { id: req.params.id }, data: { upvotes: { decrement: 1 } } });
      return res.json({ upvoted: false });
    }
    await prisma.communityUpvote.create({ data: { id: nanoid(10), userId: req.user.id, postId: req.params.id } });
    await prisma.communityPost.update({ where: { id: req.params.id }, data: { upvotes: { increment: 1 } } });
    res.json({ upvoted: true });
  } catch(err) { next(err); }
});

// DELETE /api/community/:id — delete own post
router.delete('/:id', async (req, res, next) => {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Not found.' });
    if (post.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not allowed.' });
    await prisma.communityReply.deleteMany({ where: { postId: req.params.id } });
    await prisma.communityPost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted.' });
  } catch(err) { next(err); }
});

module.exports = router;

// PATCH /api/community/:id — admin pin/helpful toggle
router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
    const { isPinned, isHelpful } = req.body;
    const data = {};
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (isHelpful !== undefined) data.isHelpful = isHelpful;
    const post = await prisma.communityPost.update({ where: { id: req.params.id }, data });
    res.json({ post });
  } catch(err) { next(err); }
});
