/**
 * Prezidox Academy — Automated blog post generator.
 * Uses the Anthropic API to draft a study-guide article, then inserts it as a
 * BlogPost. Returns the created post, or null if it can't produce one (no API
 * key, API error, or bad output) so callers can no-op safely.
 *
 * By default posts are published live. Set AUTO_BLOG_DRAFT=true to instead save
 * them as drafts for admin review (no notification will be sent in that case).
 */

const prisma = require('../utils/prisma');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// Category must be one of the blog's known categories.
const TOPICS = [
  { category: 'post-utme',   idea: 'A practical preparation guide for the UNILAG Post-UTME, covering the CBT format, subject combination, and a week-by-week study plan.' },
  { category: 'post-utme',   idea: 'What to expect in the OAU Post-UTME screening and how to prepare for its aptitude-test style questions.' },
  { category: 'study-tips',  idea: 'Evidence-based study techniques (active recall, spaced repetition, timed practice) applied to Nigerian CBT exam preparation.' },
  { category: 'study-tips',  idea: 'How to manage your time during a CBT exam so you answer every question without rushing.' },
  { category: 'post-utme',   idea: 'How Post-UTME aggregate scores are combined with JAMB scores for admission, with worked examples.' },
  { category: 'study-tips',  idea: 'The most common mistakes candidates make in Post-UTME CBT exams and how to avoid them.' },
  { category: 'news',        idea: 'A guide to staying updated on Nigerian Post-UTME screening dates and requirements for UNILAG and OAU.' },
  { category: 'study-tips',  idea: 'How to identify and fix your weak subjects using practice-test data before your exam.' },
];

function isoWeekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function slugify(title) {
  const base = String(title || 'post').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

function extractJson(text) {
  if (!text) return null;
  // Strip code fences and grab the first {...} block.
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) { return null; }
}

async function generateBlogPost() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[blogGenerator] No ANTHROPIC_API_KEY — skipping auto blog.');
    return null;
  }

  const topic = TOPICS[isoWeekNumber() % TOPICS.length];

  const prompt =
    `You are a writer for Prezidox Academy, an independent Nigerian CBT exam-prep platform for UNILAG and OAU Post-UTME candidates.\n` +
    `Write ONE original, accurate, genuinely useful blog article about: ${topic.idea}\n\n` +
    `Rules:\n` +
    `- Audience: Nigerian secondary-school leavers preparing for Post-UTME.\n` +
    `- 600-900 words. Practical, specific, encouraging. No fabricated statistics, dates, or cut-off marks — speak in general terms and tell readers to confirm official figures on the school's website.\n` +
    `- Do NOT claim affiliation with UNILAG, OAU, JAMB, WAEC, NECO, or JUPEB.\n` +
    `- Body must be clean semantic HTML using only <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>. No <script>, <style>, inline styles, or images.\n` +
    `- Do not repeat the title as an <h1> inside the body.\n\n` +
    `Return ONLY a JSON object, no prose around it, with exactly these keys:\n` +
    `{"title": string (<=70 chars), "excerpt": string (<=155 chars, plain text), "content": string (the HTML body)}`;

  let data;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      console.error('[blogGenerator] Anthropic API error:', response.status, (await response.text()).slice(0, 300));
      return null;
    }
    data = await response.json();
  } catch (e) {
    console.error('[blogGenerator] fetch error:', e.message);
    return null;
  }

  const text = data && data.content && data.content[0] && data.content[0].text;
  const parsed = extractJson(text);
  if (!parsed || !parsed.title || !parsed.content) {
    console.error('[blogGenerator] Could not parse a valid post from the model output.');
    return null;
  }

  const publishLive = String(process.env.AUTO_BLOG_DRAFT || '').toLowerCase() !== 'true';

  try {
    const post = await prisma.blogPost.create({
      data: {
        title:       String(parsed.title).slice(0, 120),
        slug:        slugify(parsed.title),
        excerpt:     String(parsed.excerpt || '').slice(0, 300) || 'A new study guide from the Prezidox Academy team.',
        content:     String(parsed.content),
        category:    topic.category,
        published:   publishLive,
        publishedAt: publishLive ? new Date() : null,
      },
    });
    console.log(`[blogGenerator] Created ${publishLive ? 'published' : 'draft'} post: ${post.title}`);
    // Only return it for announcement when it actually went live.
    return publishLive ? post : null;
  } catch (e) {
    console.error('[blogGenerator] DB insert error:', e.message);
    return null;
  }
}

module.exports = { generateBlogPost };
