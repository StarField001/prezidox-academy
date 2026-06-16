const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error('Set GEMINI_API_KEY first: source ~/.zshrc'); process.exit(1); }

const TOPICS = {
  'Use of English': ['Comprehension Passages','Vocabulary and Usage','Lexis and Structure','Oral English and Phonology','Figures of Speech','Parts of Speech','Tense and Concord','Idioms and Proverbs','Register and Varieties','Sentence Construction','Punctuation','Synonyms and Antonyms','Word Formation','Reading Skills','Essay Writing'],
  'Mathematics': ['Algebra','Indices and Logarithms','Quadratic Equations','Sequences and Series','Trigonometry','Coordinate Geometry','Euclidean Geometry','Statistics and Probability','Calculus - Differentiation','Calculus - Integration','Sets and Venn Diagrams','Number Bases','Matrices and Determinants','Surds','Mensuration'],
  'General Knowledge': ['Nigerian History and Government','Nigerian Geography','Science and Technology','Culture and Arts','Current Affairs Nigeria','Economics Fundamentals','World Geography','Health and Biology Basics','Literature and Language','Civic Education'],
  'Chemistry': ['Atomic Structure and Bonding','Stoichiometry and Mole Concept','Acids Bases and Salts','Electrochemistry','Organic Chemistry - Hydrocarbons','Organic Chemistry - Functional Groups','Chemical Equilibrium','Rates of Reaction','Periodic Table and Trends','States of Matter and Gas Laws','Environmental Chemistry','Separation Techniques','Chemical Energetics','Metals and Non-metals','Polymers'],
  'Physics': ['Mechanics - Motion','Mechanics - Forces and Energy','Heat and Thermodynamics','Waves and Sound','Light and Optics','Electricity and Circuits','Magnetism and Electromagnetism','Atomic and Nuclear Physics','Pressure and Fluids','Simple Machines','Measurement and Units','Gravitational Fields','Electromagnetic Spectrum','Electronics','Circular Motion'],
  'Biology': ['Cell Structure and Function','Cell Division - Mitosis and Meiosis','Genetics and Inheritance','Ecology and Environment','Evolution and Natural Selection','Human Digestive System','Human Respiratory System','Human Circulatory System','Human Nervous System','Human Excretory System','Plant Nutrition and Photosynthesis','Plant Transport and Reproduction','Animal Reproduction','Microorganisms and Disease','Classification of Living Things'],
  'Economics': ['Demand and Supply Analysis','Elasticity','Market Structures','National Income and GDP','Money and Banking','Inflation and Unemployment','International Trade','Public Finance and Taxation','Agricultural Economics','Industrial Development','Labour Economics','Population and Development','Nigerian Economic History','Economic Planning','Consumer Theory'],
  'Government': ['Constitutional Development in Nigeria','Nigerian Federal System','The Executive Branch','The Legislature','The Judiciary','Local Government Administration','Electoral Systems and INEC','Political Parties in Nigeria','International Organisations','Citizenship and Human Rights','Foreign Policy of Nigeria','Pressure Groups'],
  'Geography': ['Map Reading and Interpretation','Physical Geography - Landforms','Physical Geography - Rivers','Climate and Weather','Vegetation Zones of Nigeria','Rocks and Minerals','Population Geography','Agricultural Geography','Urban and Rural Settlement','West African Geography','World Geography','Environmental Issues'],
  'Literature in English': ['Poetry - Devices and Analysis','Drama - Structure and Themes','Prose Fiction - Narrative Techniques','African Literature','Characterization and Setting','Themes in Literature','Nigerian Literature','Tragedy and Comedy','Literary Criticism','Imagery and Symbolism'],
  'Accounts': ['Double Entry Bookkeeping','Trial Balance','Trading and Profit and Loss Account','Balance Sheet','Bank Reconciliation Statement','Depreciation of Assets','Control Accounts','Partnership Accounts','Company Final Accounts','Cash Flow Statement','Ratio Analysis','Costing and Marginal Costing'],
  'Further Mathematics': ['Further Algebra','Complex Numbers','Vectors','Matrices Advanced','Differential Equations','Further Calculus','Probability Distributions','Permutations and Combinations','Further Trigonometry','Linear Programming','Numerical Methods'],
  'Agricultural Science': ['Crop Production - Cereals','Crop Production - Legumes','Animal Production - Poultry','Animal Production - Livestock','Soil Science and Fertility','Pest and Disease Control','Forestry and Conservation','Fisheries','Farm Management'],
  'Commerce': ['Trade - Home and Foreign','Insurance Principles','Banking and Finance','Advertising and Marketing','Business Organisations','Import and Export','Consumer Protection','Entrepreneurship','Business Finance'],
  'History': ['Pre-Colonial African History','Colonial History of Nigeria','Nigerian Independence','Post-Colonial Africa','World War I','World War II','Nationalist Movements','Pan-Africanism','Nigerian Civil War','History of West Africa'],
  'Christian Religious Studies': ['Creation and Fall','Life of Jesus','Parables and Miracles','Paul and Epistles','The Early Church','Christian Ethics','Christianity in Nigeria'],
  'Islamic Religious Studies': ['Quran and Tafsir','Hadith and Sunnah','Islamic History - Early Period','Islamic Jurisprudence','Islamic Worship - Salat Zakat','Islamic Ethics','Islam in Nigeria'],
  'French': ['French Grammar - Verbs','French Vocabulary','French Comprehension','French Composition','French Conversation','French Culture','Francophone Africa'],
  'Computer Science': ['Computer Hardware','Operating Systems','Programming Fundamentals','Data Structures','Computer Networks','Internet and Web Technology','Database Management','Computer Ethics and Security','Algorithms'],
};

const UNILAG_SUBJECTS = Object.keys(TOPICS);
const OAU_SUBJECTS = ['Use of English','Mathematics','Chemistry','Physics','Biology','Economics','Government','Geography','Literature in English','Accounts','History','Agricultural Science'];
const BATCH_SIZE = 20;
const TARGET = 200;
const topicIdx = {};
let allQuestions = [];
let totalGenerated = 0;
let totalSkipped = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function nextTopic(cat, subject) {
  const key = cat+'_'+subject;
  const topics = TOPICS[subject] || ['General'];
  if (!topicIdx[key]) topicIdx[key] = 0;
  const t = topics[topicIdx[key] % topics.length];
  topicIdx[key]++;
  return t;
}

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.error) return reject(new Error(p.error.message));
          const text = p.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function generateBatch(subject, category, topic) {
  const catName = category === 'oau' ? 'OAU (Obafemi Awolowo University)' : 'UNILAG (University of Lagos)';
  const prompt = `Generate exactly ${BATCH_SIZE} unique multiple-choice questions for ${catName} Post-UTME examination.
Subject: ${subject}
Topic: ${topic}
Difficulty distribution: 35% easy, 45% medium, 20% hard
Nigerian secondary school curriculum standard.

Return a JSON array only:
[{"question":"full question text","optionA":"option A","optionB":"option B","optionC":"option C","optionD":"option D","answer":"A","explanation":"brief explanation of correct answer","difficulty":"easy"}]`;

  const raw = await callGemini(prompt);
  let qs;
  try {
    const clean = raw.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    qs = JSON.parse(clean);
  } catch(e) {
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) qs = JSON.parse(m[0]);
    else throw new Error('Parse failed: ' + raw.substring(0,100));
  }
  if (!Array.isArray(qs) || qs.length === 0) throw new Error('Empty response');
  return qs.map(q => ({
    category,
    subject,
    topic,
    year: null,
    question: (q.question||'').trim(),
    optionA: (q.optionA||'').trim(),
    optionB: (q.optionB||'').trim(),
    optionC: (q.optionC||'').trim(),
    optionD: (q.optionD||'').trim(),
    answer: (q.answer||'A').trim(),
    explanation: (q.explanation||'').trim(),
    difficulty: (q.difficulty||'medium').trim(),
    isBattleReady: true,
    isSpeedReady: false,
  }));
}

function saveProgress() {
  const f = path.join(__dirname, 'generated_questions.json');
  fs.writeFileSync(f, JSON.stringify(allQuestions, null, 2));
}

function generateSQL() {
  if (allQuestions.length === 0) return;
  const esc = v => (v||'').replace(/'/g,"''").replace(/\0/g,'');
  const rows = allQuestions.map(q =>
    `('${esc(q.category)}','${esc(q.subject)}','${esc(q.topic)}',NULL,` +
    `'${esc(q.question)}','${esc(q.optionA)}','${esc(q.optionB)}','${esc(q.optionC)}','${esc(q.optionD)}',` +
    `'${esc(q.answer)}','${esc(q.explanation)}','${esc(q.difficulty)}',true,false,NOW())`
  ).join(',\n');
  const sql = `INSERT INTO "Question" (category,subject,topic,year,question,"optionA","optionB","optionC","optionD",answer,explanation,difficulty,"isBattleReady","isSpeedReady","createdAt")\nVALUES\n${rows}\nON CONFLICT DO NOTHING;`;
  const f = path.join(__dirname, 'generated_questions.sql');
  fs.writeFileSync(f, sql);
}

async function processSubject(subject, category) {
  const batches = Math.ceil(TARGET / BATCH_SIZE);
  let subjectTotal = 0;
  console.log(`\n▶ [${category.toUpperCase()}] ${subject} — ${batches} batches of ${BATCH_SIZE}`);
  for (let i = 0; i < batches; i++) {
    const topic = nextTopic(category, subject);
    let retries = 3;
    let success = false;
    while (retries > 0 && !success) {
      try {
        process.stdout.write(`  [${i+1}/${batches}] "${topic}"... `);
        const qs = await generateBatch(subject, category, topic);
        allQuestions.push(...qs);
        subjectTotal += qs.length;
        totalGenerated += qs.length;
        console.log(`+${qs.length} ✓ (total: ${totalGenerated})`);
        saveProgress();
        success = true;
        await sleep(3000);
      } catch(e) {
        retries--;
        const msg = e.message.substring(0,60);
        if (retries > 0) {
          console.log(`retry (${msg})`);
          await sleep(5000);
        } else {
          totalSkipped++;
          console.log(`SKIP (${msg})`);
        }
      }
    }
  }
  generateSQL();
  console.log(`  ✓ ${subject} done — ${subjectTotal} questions`);
  return subjectTotal;
}

async function main() {
  const start = Date.now();
  console.log('═'.repeat(55));
  console.log('PREZIDOX QUESTION GENERATOR — Gemini 1.5 Flash');
  console.log(`Target: ${TARGET} per subject | Batch: ${BATCH_SIZE}`);
  console.log('Output: scripts/generated_questions.sql');
  console.log('═'.repeat(55));

  // Check if resuming
  const jsonFile = path.join(__dirname, 'generated_questions.json');
  if (fs.existsSync(jsonFile)) {
    const existing = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    if (existing.length > 0) {
      allQuestions = existing;
      totalGenerated = existing.length;
      console.log(`\nResuming from previous run — ${totalGenerated} questions already generated`);
    }
  }

  console.log('\n── ROUND 1: UNILAG (19 subjects) ──');
  for (const s of UNILAG_SUBJECTS) await processSubject(s, 'unilag');

  console.log('\n── ROUND 2: OAU (12 subjects) ──');
  for (const s of OAU_SUBJECTS) await processSubject(s, 'oau');

  const elapsed = Math.round((Date.now()-start)/60000);
  generateSQL();

  console.log('\n' + '═'.repeat(55));
  console.log(`COMPLETE in ${elapsed} minutes`);
  console.log(`Total questions: ${totalGenerated}`);
  console.log(`Batches skipped: ${totalSkipped}`);
  console.log('');
  console.log('Next step:');
  console.log('1. Open Railway PostgreSQL console');
  console.log('2. Paste contents of scripts/generated_questions.sql');
  console.log('3. Run it');
  console.log('═'.repeat(55));
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  saveProgress();
  generateSQL();
  console.log('Progress saved. Run again to resume.');
  process.exit(1);
});
