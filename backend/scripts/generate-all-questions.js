process.env.DATABASE_URL = 'postgresql://postgres:gSnphLEefUipyLfECuyOgjRlyShUtCeu@zephyr.proxy.rlwy.net:34397/railway?sslmode=no-verify';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { PrismaClient } = require('@prisma/client');
const https = require('https');
const prisma = new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('ERROR: GROQ_API_KEY not set. Run: source ~/.zshrc');
  process.exit(1);
}

const TOPICS = {
  'Use of English': ['Comprehension Passages','Vocabulary and Usage','Lexis and Structure','Oral English and Phonology','Figures of Speech','Parts of Speech','Tense and Concord','Idioms and Proverbs','Register and Varieties','Sentence Construction','Punctuation','Synonyms and Antonyms','Word Formation','Reading Skills','Essay Writing'],
  'Mathematics': ['Algebra','Indices and Logarithms','Quadratic Equations','Sequences and Series','Trigonometry','Coordinate Geometry','Euclidean Geometry','Statistics and Probability','Calculus - Differentiation','Calculus - Integration','Sets and Venn Diagrams','Number Bases','Matrices and Determinants','Surds','Mensuration'],
  'General Knowledge': ['Nigerian History and Government','Nigerian Geography','Science and Technology','Culture and Arts','Current Affairs Nigeria','Economics Fundamentals','World Geography','Health and Biology Basics','Literature and Language','Civic Education'],
  'Chemistry': ['Atomic Structure and Bonding','Stoichiometry and Mole Concept','Acids Bases and Salts','Electrochemistry','Organic Chemistry - Hydrocarbons','Organic Chemistry - Functional Groups','Chemical Equilibrium','Rates of Reaction','Periodic Table and Trends','States of Matter and Gas Laws','Environmental Chemistry','Separation Techniques','Chemical Energetics','Metals and Non-metals','Polymers'],
  'Physics': ['Mechanics - Motion','Mechanics - Forces and Energy','Heat and Thermodynamics','Waves and Sound','Light and Optics','Electricity and Circuits','Magnetism and Electromagnetism','Atomic and Nuclear Physics','Pressure and Fluids','Simple Machines','Measurement and Units','Gravitational Fields','Electromagnetic Spectrum','Electronics','Circular Motion'],
  'Biology': ['Cell Structure and Function','Cell Division - Mitosis and Meiosis','Genetics and Inheritance','Ecology and Environment','Evolution and Natural Selection','Human Digestive System','Human Respiratory System','Human Circulatory System','Human Nervous System','Human Excretory System','Plant Nutrition and Photosynthesis','Plant Transport and Reproduction','Animal Reproduction','Microorganisms and Disease','Classification of Living Things'],
  'Economics': ['Demand and Supply Analysis','Elasticity','Market Structures','National Income and GDP','Money and Banking','Inflation and Unemployment','International Trade','Public Finance and Taxation','Agricultural Economics','Industrial Development','Labour Economics','Population and Development','Nigerian Economic History','Economic Planning','Consumer Theory'],
  'Government': ['Constitutional Development in Nigeria','Nigerian Federal System','The Executive Branch','The Legislature','The Judiciary','Local Government Administration','Electoral Systems and INEC','Political Parties in Nigeria','International Organisations','Citizenship and Human Rights','Federalism and Unitarism','Political Concepts and Ideology','Foreign Policy of Nigeria','Pressure Groups','Public Service and Bureaucracy'],
  'Geography': ['Map Reading and Interpretation','Physical Geography - Landforms','Physical Geography - Rivers','Climate and Weather','Vegetation Zones of Nigeria','Rocks and Minerals','Population Geography','Agricultural Geography','Industrial Geography','Urban and Rural Settlement','Transportation and Trade','West African Geography','World Geography','Environmental Issues','Remote Sensing'],
  'Literature in English': ['Poetry - Devices and Analysis','Drama - Structure and Themes','Prose Fiction - Narrative Techniques','African Literature','Characterization and Setting','Themes in Literature','Oral Literature and Folklore','Nigerian Literature','Tragedy and Comedy','Set Text - Novel','Set Text - Play','Set Text - Poetry','Literary Criticism','Imagery and Symbolism','Genre and Style'],
  'Accounts': ['Double Entry Bookkeeping','Trial Balance','Trading and Profit and Loss Account','Balance Sheet','Bank Reconciliation Statement','Depreciation of Assets','Control Accounts','Partnership Accounts','Company Final Accounts','Manufacturing Accounts','Incomplete Records','Cash Flow Statement','Budgetary Control','Ratio Analysis','Costing and Marginal Costing'],
  'Further Mathematics': ['Further Algebra','Complex Numbers','Vectors','Matrices Advanced','Differential Equations','Further Calculus','Probability Distributions','Permutations and Combinations','Mathematical Induction','Further Trigonometry','Conic Sections','Linear Programming','Numerical Methods','Further Statistics','Mechanics - Statics'],
  'Agricultural Science': ['Crop Production - Cereals','Crop Production - Legumes','Animal Production - Poultry','Animal Production - Livestock','Soil Science and Fertility','Farm Machinery','Agricultural Economics','Pest and Disease Control','Irrigation and Water Management','Genetics in Agriculture','Forestry and Conservation','Fisheries','Crop Storage','Agricultural Land Use','Farm Management'],
  'Commerce': ['Trade - Home and Foreign','Insurance Principles','Banking and Finance','Transportation and Communication','Warehousing and Storage','Advertising and Marketing','Business Organisations','Import and Export','Consumer Protection','Commodity Exchange','Tourism','Entrepreneurship','E-Commerce','Supply Chain','Business Finance'],
  'History': ['Pre-Colonial African History','Colonial History of Nigeria','Nigerian Independence','Post-Colonial Africa','World War I','World War II','The Cold War','American History','European History','Ancient Civilisations','Nationalist Movements','Pan-Africanism','Nigerian Civil War','History of West Africa','Social and Cultural History'],
  'Christian Religious Studies': ['Creation and Fall','Abraham and Patriarchs','Moses and Exodus','Old Testament Prophets','Life of Jesus','Parables and Miracles','Paul and Epistles','The Early Church','Christian Ethics','Christian Worship','Christian Social Issues','Christian Doctrine','Christianity in Nigeria','Ecumenism','Christian Family Life'],
  'Islamic Religious Studies': ['Quran and Tafsir','Hadith and Sunnah','Islamic History - Early Period','Islamic History - Caliphate','Islamic Jurisprudence','Islamic Worship - Salat Zakat','Islamic Worship - Hajj Sawm','Islamic Ethics','Islamic Family Law','Islamic Economics','Sufism','Islam in Nigeria','Islamic Education','Islamic Social Teachings','Contemporary Islamic Issues'],
  'French': ['French Grammar - Verbs','French Grammar - Nouns','French Vocabulary','French Comprehension','French Composition','French Conversation','French Culture','French Literature','Francophone Africa','French Pronunciation','French Idioms','French Business Language','French History','French Social Customs','French-Nigerian Relations'],
  'Computer Science': ['Computer Hardware','Operating Systems','Programming Fundamentals','Data Structures','Computer Networks','Internet and Web Technology','Database Management','Spreadsheets and Word Processing','Computer Ethics and Security','Algorithms','Binary and Number Systems','Artificial Intelligence Basics','Computer Graphics','Information Systems','History of Computing'],
};

const UNILAG_SUBJECTS = Object.keys(TOPICS);
const OAU_SUBJECTS = ['Use of English','Mathematics','Chemistry','Physics','Biology','Economics','Government','Geography','Literature in English','Accounts','History','Agricultural Science'];
const YEARS = ['2025','2024','2023','2022','2021'];

const BATCH_SIZE = 10;
const TARGET_PER_SUBJECT = 200;
const TARGET_PER_YEAR = 40;

let totalInserted = 0;
let totalErrors = 0;
const topicIndex = {};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function nextTopic(cat, subject) {
  const key = cat + '_' + subject;
  const topics = TOPICS[subject] || ['General'];
  if (!topicIndex[key]) topicIndex[key] = 0;
  const topic = topics[topicIndex[key] % topics.length];
  topicIndex[key]++;
  return topic;
}

function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 6000,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'You are an expert Nigerian university entrance exam question writer. Always respond with valid JSON only, no markdown, no extra text.' },
        { role: 'user', content: prompt }
      ],
    });
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': 'Bearer ' + GROQ_API_KEY,
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.choices?.[0]?.message?.content || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

async function generateBatch(subject, category, topic, year = null) {
  const catName = category === 'oau' ? 'OAU (Obafemi Awolowo University)' : 'UNILAG (University of Lagos)';
  const yearText = year ? `Style as past questions from ${year} ${catName} Post-UTME.` : '';

  const prompt = `Generate exactly ${BATCH_SIZE} unique multiple-choice questions for ${catName} Post-UTME.
Subject: ${subject}
Topic: ${topic}
${yearText}
Difficulty: 35% easy, 45% medium, 20% hard

Return ONLY this JSON array, nothing else:
[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","answer":"A","explanation":"brief explanation","difficulty":"easy"}]`;

  const raw = await callGroq(prompt);
  let questions;
  try {
    const clean = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    questions = JSON.parse(clean);
  } catch(e) {
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) questions = JSON.parse(m[0]);
    else throw new Error('JSON parse failed: ' + raw.substring(0, 100));
  }
  if (!Array.isArray(questions)) throw new Error('Not an array');
  return questions.map(q => ({
    category,
    subject,
    topic,
    year: year ? parseInt(year) : null,
    question: (q.question || '').trim(),
    optionA: (q.optionA || '').trim(),
    optionB: (q.optionB || '').trim(),
    optionC: (q.optionC || '').trim(),
    optionD: (q.optionD || '').trim(),
    answer: (q.answer || 'A').trim(),
    explanation: (q.explanation || '').trim(),
    difficulty: (q.difficulty || 'medium').trim(),
    isBattleReady: true,
    isSpeedReady: false,
  }));
}

async function insertQuestions(questions) {
  const result = await prisma.question.createMany({
    data: questions,
    skipDuplicates: true,
  });
  return result.count;
}

async function processSubject(subject, category, year = null) {
  const tag = year
    ? `[${category.toUpperCase()}] ${subject} — ${year}`
    : `[${category.toUpperCase()}] ${subject}`;
  const target = year ? TARGET_PER_YEAR : TARGET_PER_SUBJECT;
  const batches = Math.ceil(target / BATCH_SIZE);
  let inserted = 0;

  console.log(`\n▶ ${tag} — target: ${target} in ${batches} batches`);

  for (let i = 0; i < batches; i++) {
    const topic = nextTopic(category, subject);
    let retries = 2;
    while (retries >= 0) {
      try {
        process.stdout.write(`  [${i+1}/${batches}] "${topic}"... `);
        const questions = await generateBatch(subject, category, topic, year);
        const count = await insertQuestions(questions);
        inserted += count;
        totalInserted += count;
        console.log(`✓ +${count} (subject total: ${inserted})`);
        await sleep(8000);
        break;
      } catch(e) {
        retries--;
        if (retries >= 0) {
          console.log(`retry... (${e.message.substring(0,50)})`);
          await sleep(10000);
        } else {
          totalErrors++;
          console.log(`✗ FAILED: ${e.message.substring(0,80)}`);
        }
      }
    }
  }
  console.log(`✓ ${tag} complete — ${inserted} questions inserted`);
  return inserted;
}

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('PREZIDOX ACADEMY — AUTO QUESTION GENERATOR');
  console.log('Using: Groq API (llama-3.1-8b-instant)');
  console.log(`Target: ${TARGET_PER_SUBJECT} per subject, ${TARGET_PER_YEAR} per year`);
  console.log('='.repeat(60));

  // Wait for DB connection with retries
  let existing = 0;
  for (let i = 0; i < 5; i++) {
    try {
      existing = await prisma.question.count();
      console.log(`\nConnected to DB. Existing questions: ${existing}`);
      break;
    } catch(e) {
      console.log(`DB connection attempt ${i+1}/5 failed: ${e.message.substring(0,50)}`);
      await sleep(5000);
      if (i === 4) throw e;
    }
  }

  // ROUND 1 — UNILAG
  console.log('\n' + '='.repeat(60));
  console.log('ROUND 1 — UNILAG (19 subjects)');
  console.log('='.repeat(60));
  for (const subject of UNILAG_SUBJECTS) {
    await processSubject(subject, 'unilag');
  }

  // ROUND 2 — OAU
  console.log('\n' + '='.repeat(60));
  console.log('ROUND 2 — OAU (12 subjects)');
  console.log('='.repeat(60));
  for (const subject of OAU_SUBJECTS) {
    await processSubject(subject, 'oau');
  }

  // ROUND 3 — Year Vault UNILAG (core subjects only)
  console.log('\n' + '='.repeat(60));
  console.log('ROUND 3 — YEAR VAULT UNILAG (top 6 subjects x 5 years)');
  console.log('='.repeat(60));
  const coreSubjects = ['Use of English','Mathematics','Chemistry','Physics','Biology','General Knowledge'];
  for (const subject of coreSubjects) {
    for (const year of YEARS) {
      await processSubject(subject, 'unilag', year);
    }
  }

  // ROUND 4 — Year Vault OAU (core subjects only)
  console.log('\n' + '='.repeat(60));
  console.log('ROUND 4 — YEAR VAULT OAU (top 6 subjects x 5 years)');
  console.log('='.repeat(60));
  const oauCore = ['Use of English','Mathematics','Chemistry','Physics','Biology','Economics'];
  for (const subject of oauCore) {
    for (const year of YEARS) {
      await processSubject(subject, 'oau', year);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 60000);
  const final = await prisma.question.count();

  console.log('\n' + '='.repeat(60));
  console.log('GENERATION COMPLETE');
  console.log(`Time taken: ${elapsed} minutes`);
  console.log(`Questions inserted this run: ${totalInserted}`);
  console.log(`Total questions in DB: ${final}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('\nFATAL ERROR:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
