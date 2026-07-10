/**
 * Prezidox Academy — Notification helper
 * Centralises in-app Notification creation so cron jobs, routes, and events
 * all create notifications the same way.
 */

const prisma = require('../utils/prisma');

/** Create a single in-app notification. Never throws. */
async function createNotification(userId, { type, title, body, ctaText = null, ctaUrl = null, channel = 'in_app' }) {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, ctaText, ctaUrl, channel, read: false },
    });
  } catch (e) {
    console.error('[notify] createNotification error:', e.message);
    return null;
  }
}

/** Bulk-create the same notification for many users. Returns count created. */
async function notifyMany(userIds, { type, title, body, ctaText = null, ctaUrl = null, channel = 'in_app' }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return 0;
  try {
    // Chunk to keep the insert reasonable for large audiences.
    let created = 0;
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const res = await prisma.notification.createMany({
        data: slice.map((userId) => ({ userId, type, title, body, ctaText, ctaUrl, channel, read: false })),
      });
      created += res.count || 0;
    }
    return created;
  } catch (e) {
    console.error('[notify] notifyMany error:', e.message);
    return 0;
  }
}

/** Notify every active user (verified + not suspended). Returns count. */
async function notifyAllUsers(payload, { onlyVerified = true } = {}) {
  const where = { suspended: false };
  if (onlyVerified) where.emailVerified = true;
  const users = await prisma.user.findMany({ where, select: { id: true } });
  return notifyMany(users.map((u) => u.id), payload);
}

/** Announce a newly published blog post to all active users. */
async function notifyNewBlogPost(post) {
  if (!post || !post.slug) return 0;
  return notifyAllUsers({
    type:    'blog_published',
    title:   'New on the blog: ' + post.title,
    body:    post.excerpt || 'A new study guide has just been published. Give it a read.',
    ctaText: 'Read Article',
    ctaUrl:  '/blog-post.html?slug=' + encodeURIComponent(post.slug),
  });
}

module.exports = { createNotification, notifyMany, notifyAllUsers, notifyNewBlogPost };
