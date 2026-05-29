const router = require('express').Router();
const prisma = require('../utils/prisma');

// GET /api/blog — list published posts
router.get('/', async (req, res, next) => {
  try {
    const { category, limit = 10, offset = 0 } = req.query;
    const where = { published: true };
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take:    parseInt(limit),
        skip:    parseInt(offset),
        select: {
          id:          true,
          title:       true,
          slug:        true,
          excerpt:     true,
          category:    true,
          coverImage:  true,
          publishedAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ posts, total });
  } catch (err) { next(err); }
});

// GET /api/blog/:slug — single post
router.get('/:slug', async (req, res, next) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
    });

    if (!post || !post.published) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({ post });
  } catch (err) { next(err); }
});

module.exports = router;
