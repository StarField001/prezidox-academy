const router  = require('express').Router();
const prisma  = require('../../utils/prisma');
const { requireAdmin } = require('../../middleware/adminAuth');
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAdmin);

// ─── LIST QUESTIONS ───────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, category, subject, topic, year, limit = 50, offset = 0 } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subject)  where.subject  = subject;
    if (topic)    where.topic    = topic;
    if (year)     where.year     = parseInt(year);
    if (search)   where.question = { contains: search, mode: 'insensitive' };

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    Math.min(parseInt(limit), 500),
        skip:    parseInt(offset),
      }),
      prisma.question.count({ where }),
    ]);

    res.json({ questions, total });
  } catch (err) { next(err); }
});

// ─── CREATE QUESTION ──────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { category, subject, topic, year, question, optionA, optionB, optionC, optionD, answer, explanation, glossary } = req.body;

    const required = { category, subject, topic, question, optionA, optionB, optionC, optionD, answer };
    const missing  = Object.entries(required).filter(([k,v]) => !v).map(([k]) => k);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    if (!['A','B','C','D'].includes(answer)) return res.status(400).json({ error: 'Answer must be A, B, C, or D.' });

    const q = await prisma.question.create({
      data: { category, subject, topic, year: year ? parseInt(year) : null, question, optionA, optionB, optionC, optionD, answer, explanation: explanation || null, glossary: glossary || null },
    });
    res.status(201).json({ question: q });
  } catch (err) { next(err); }
});

// ─── UPDATE QUESTION ──────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['category','subject','topic','year','question','optionA','optionB','optionC','optionD','answer','explanation','glossary'];
    const data = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    if (data.year) data.year = parseInt(data.year);
    if (data.answer && !['A','B','C','D'].includes(data.answer)) {
      return res.status(400).json({ error: 'Answer must be A, B, C, or D.' });
    }
    const q = await prisma.question.update({ where: { id: req.params.id }, data });
    res.json({ question: q });
  } catch (err) { next(err); }
});

// ─── DELETE QUESTION ──────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'DELETE_QUESTION', target: `question:${req.params.id}` } });
    res.json({ message: 'Question deleted.' });
  } catch (err) { next(err); }
});

// ─── CSV IMPORT ───────────────────────────────────────
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required.' });

    const csv     = req.file.buffer.toString('utf8');
    const lines   = csv.split('\n').map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const required = ['category','subject','topic','question','optiona','optionb','optionc','optiond','answer'];
    const missing  = required.filter(h => !headers.includes(h));
    if (missing.length) {
      return res.status(400).json({ error: `Missing CSV columns: ${missing.join(', ')}` });
    }

    const valid = [], invalid = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const row  = {};
      headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() || ''; });

      const answers = ['a','b','c','d'].map(a => a.toUpperCase());
      if (!row.category || !row.subject || !row.topic || !row.question || !row.optiona || !row.optionb || !row.optionc || !row.optiond || !answers.includes(row.answer?.toUpperCase())) {
        invalid.push({ row: i + 1, data: row, reason: 'Missing or invalid fields' });
        continue;
      }

      valid.push({
        category:    row.category,
        subject:     row.subject,
        topic:       row.topic,
        year:        row.year ? parseInt(row.year) : null,
        question:    row.question,
        optionA:     row.optiona,
        optionB:     row.optionb,
        optionC:     row.optionc,
        optionD:     row.optiond,
        answer:      row.answer.toUpperCase(),
        explanation: row.explanation || null,
      });
    }

    let inserted = 0;
    if (valid.length > 0) {
      const result = await prisma.question.createMany({ data: valid, skipDuplicates: true });
      inserted = result.count;
    }

    res.json({ inserted, invalid, total: lines.length - 1 });
  } catch (err) { next(err); }
});

// ─── CSV EXPORT ───────────────────────────────────────
router.get('/export', async (req, res, next) => {
  try {
    const { category, subject } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subject)  where.subject  = subject;

    const questions = await prisma.question.findMany({ where, orderBy: { category: 'asc' } });

    const header = 'category,subject,topic,year,question,optionA,optionB,optionC,optionD,answer,explanation\n';
    const rows   = questions.map(q =>
      [q.category, q.subject, q.topic, q.year || '', esc(q.question), esc(q.optionA), esc(q.optionB), esc(q.optionC), esc(q.optionD), q.answer, esc(q.explanation || '')].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="prezidox-questions.csv"');
    res.send(header + rows);
  } catch (err) { next(err); }
});

// ─── DOWNLOAD CSV TEMPLATE ────────────────────────────
router.get('/template', (req, res) => {
  const csv = `category,subject,topic,year,question,optionA,optionB,optionC,optionD,answer,explanation
unilag,Mathematics,Quadratic Equations,2022,"If 3x² - 5x + 2 = 0 find x",1 and 2/3,2 and 1/3,-1 and 2/3,1 and -2/3,A,"Using factorisation: (3x-2)(x-1)=0"
unilag,Use of English,Comprehension,2021,"Choose the word closest in meaning to BENEVOLENT",Kind,Cruel,Angry,Selfish,A,Benevolent means kind or generous`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="question-template.csv"');
  res.send(csv);
});

// ─── HELPERS ──────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(cur); cur = ''; }
    else { cur += line[i]; }
  }
  result.push(cur);
  return result;
}

module.exports = router;
