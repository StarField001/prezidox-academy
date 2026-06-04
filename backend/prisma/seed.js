require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Prezidox Academy database...\n');

  // ─── ADMIN ACCOUNT ──────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@prezidox.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Prezidox2026!';
  const adminName     = process.env.ADMIN_NAME     || 'Prezidox Admin';

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({
      data: { name: adminName, email: adminEmail, passwordHash, role: 'superadmin', mustChangePassword: true },
    });
    console.log(`✅ Admin created: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  Change this password on first login!\n`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}\n`);
  }

  // ─── PLATFORM SETTINGS ───────────────────────────────
  const defaultSettings = [
    { key: 'trialDurationHours', value: 72 },
    { key: 'maintenanceMode',    value: false },
    { key: 'announcementBanner', value: '' },
    { key: 'categoryStatus',     value: { unilag:'active',oau:'active',jamb:'coming_soon',waec:'coming_soon',neco:'coming_soon',jupeb:'coming_soon',undergrad:'coming_soon' } },
    { key: 'subscriptionPrices', value: { unilag:4500, oau:4500, bundle:8500 } },
    { key: 'subscriptionExpiry', value: { unilag:'2026-12-31', oau:'2026-12-31', bundle:'2026-12-31' } },
  ];

  for (const s of defaultSettings) {
    await prisma.platformSetting.upsert({
      where:  { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    });
  }
  console.log('✅ Platform settings seeded\n');

  // ─── QUESTIONS ────────────────────────────────────────
  const existingCount = await prisma.question.count();
  if (existingCount > 0) {
    console.log(`ℹ️  ${existingCount} questions already exist. Skipping question seed.\n`);
  } else {
    const questions = [
      // ── Use of English ──
      { category:'unilag', subject:'Use of English', topic:'Comprehension', year:2022, question:'Choose the word closest in meaning to BENEVOLENT.', optionA:'Kind', optionB:'Cruel', optionC:'Arrogant', optionD:'Selfish', answer:'A', explanation:'Benevolent means kind, generous, or well-meaning.' },
      { category:'unilag', subject:'Use of English', topic:'Comprehension', year:2022, question:'Which of the following is an antonym of VERBOSE?', optionA:'Wordy', optionB:'Concise', optionC:'Elaborate', optionD:'Talkative', answer:'B', explanation:'Verbose means using more words than needed. Its antonym is concise — brief and clear.' },
      { category:'unilag', subject:'Use of English', topic:'Lexis and Structure', year:2021, question:'Select the correctly spelled word.', optionA:'Accomodate', optionB:'Accommodate', optionC:'Acommodate', optionD:'Acomodate', answer:'B', explanation:'The correct spelling is accommodate — double c and double m.' },
      { category:'unilag', subject:'Use of English', topic:'Lexis and Structure', year:2021, question:'The expression "it is raining cats and dogs" is an example of:', optionA:'Metaphor', optionB:'Simile', optionC:'Idiom', optionD:'Hyperbole', answer:'C', explanation:'An idiom is a phrase whose meaning cannot be deduced from its individual words.' },
      { category:'unilag', subject:'Use of English', topic:'Summary', year:2020, question:'Which of the following is NOT a feature of a good summary?', optionA:'Brevity', optionB:'Clarity', optionC:'Verbosity', optionD:'Coherence', answer:'C', explanation:'Verbosity (using excessive words) is the opposite of what a good summary requires.' },
      { category:'unilag', subject:'Use of English', topic:'Oral English', year:2022, question:'The word "phone" has how many phonemes?', optionA:'3', optionB:'4', optionC:'5', optionD:'2', answer:'A', explanation:'Phone = /f/ /əʊ/ /n/ — 3 phonemes.' },

      // ── Mathematics ──
      { category:'unilag', subject:'Mathematics', topic:'Geometric Progression', year:2022, question:'If the 5th term of a G.P is 48 and the 2nd term is 6, find the common ratio.', optionA:'2', optionB:'3', optionC:'4', optionD:'5', answer:'A', explanation:'T₅=ar⁴=48, T₂=ar=6. Dividing: r³=8, r=2.', glossary:{ 'G.P': 'Geometric Progression — a sequence where each term is multiplied by a constant ratio', 'common ratio': 'The fixed multiplier between consecutive terms' } },
      { category:'unilag', subject:'Mathematics', topic:'Quadratic Equations', year:2021, question:'Solve 3x² - 5x + 2 = 0.', optionA:'x = 1 or x = 2/3', optionB:'x = -1 or x = 2/3', optionC:'x = 1 or x = -2/3', optionD:'x = 2 or x = 1/3', answer:'A', explanation:'Factorising: (3x-2)(x-1)=0. So x=1 or x=2/3.' },
      { category:'unilag', subject:'Mathematics', topic:'Logarithms', year:2021, question:'Evaluate log₂ 64.', optionA:'6', optionB:'8', optionC:'4', optionD:'32', answer:'A', explanation:'2⁶ = 64, so log₂ 64 = 6.' },
      { category:'unilag', subject:'Mathematics', topic:'Trigonometry', year:2020, question:'Find the value of sin 30° + cos 60°.', optionA:'1', optionB:'0.5', optionC:'√3/2', optionD:'√2/2', answer:'A', explanation:'sin 30° = 0.5, cos 60° = 0.5. Sum = 1.' },
      { category:'unilag', subject:'Mathematics', topic:'Set Theory', year:2022, question:'If A = {1,2,3,4,5} and B = {3,4,5,6,7}, find A ∩ B.', optionA:'{3,4,5}', optionB:'{1,2,6,7}', optionC:'{1,2,3,4,5,6,7}', optionD:'{}', answer:'A', explanation:'The intersection A ∩ B contains elements in both sets: {3,4,5}.', glossary:{ 'intersection': 'Elements that belong to both sets', 'union': 'All elements in either set' } },
      { category:'unilag', subject:'Mathematics', topic:'Statistics', year:2021, question:'Find the mean of: 4, 7, 2, 9, 3.', optionA:'5', optionB:'6', optionC:'4', optionD:'7', answer:'A', explanation:'Sum = 4+7+2+9+3 = 25. Mean = 25÷5 = 5.' },
      { category:'unilag', subject:'Mathematics', topic:'Arithmetic Progression', year:2020, question:'The nth term of an A.P is 3n+2. Find the 10th term.', optionA:'32', optionB:'30', optionC:'28', optionD:'35', answer:'A', explanation:'T₁₀ = 3(10)+2 = 32.' },

      // ── General Knowledge ──
      { category:'unilag', subject:'General Knowledge', topic:'Nigerian History', year:2022, question:'In what year did Nigeria gain independence?', optionA:'1960', optionB:'1963', optionC:'1956', optionD:'1914', answer:'A', explanation:'Nigeria gained independence from Britain on October 1, 1960.' },
      { category:'unilag', subject:'General Knowledge', topic:'Nigerian History', year:2021, question:'Who was the first President of Nigeria?', optionA:'Nnamdi Azikiwe', optionB:'Tafawa Balewa', optionC:'Aguiyi-Ironsi', optionD:'Yakubu Gowon', answer:'A', explanation:'Dr. Nnamdi Azikiwe became Nigeria\'s first President in 1963 when Nigeria became a republic.' },
      { category:'unilag', subject:'General Knowledge', topic:'Geography', year:2022, question:'What is the longest river in Nigeria?', optionA:'River Niger', optionB:'River Benue', optionC:'River Cross', optionD:'River Kaduna', answer:'A', explanation:'The River Niger is the longest river in Nigeria, flowing from Guinea through Mali, Niger, Benin, and Nigeria to the Atlantic.' },
      { category:'unilag', subject:'General Knowledge', topic:'Government', year:2021, question:'The Nigerian constitution that ushered in the Second Republic was adopted in:', optionA:'1979', optionB:'1963', optionC:'1999', optionD:'1975', answer:'A', explanation:'The 1979 constitution introduced the presidential system of government in Nigeria\'s Second Republic.' },
      { category:'unilag', subject:'General Knowledge', topic:'Science', year:2022, question:'What is the chemical symbol for Gold?', optionA:'Au', optionB:'Ag', optionC:'Fe', optionD:'Go', answer:'A', explanation:'Gold\'s symbol Au comes from the Latin word "Aurum".' },
      { category:'unilag', subject:'General Knowledge', topic:'Current Affairs', year:2022, question:'The University of Lagos (UNILAG) was founded in:', optionA:'1962', optionB:'1960', optionC:'1948', optionD:'1975', answer:'A', explanation:'The University of Lagos was established in 1962 by an Act of Parliament.' },

      // ── Chemistry ──
      { category:'unilag', subject:'Chemistry', topic:'Atomic Structure', year:2022, question:'The number of protons in an atom is called its:', optionA:'Atomic number', optionB:'Mass number', optionC:'Atomic mass', optionD:'Neutron number', answer:'A', explanation:'The atomic number (Z) is the number of protons in the nucleus of an atom.', glossary:{ 'atomic number': 'Number of protons in an atom\'s nucleus', 'mass number': 'Total number of protons and neutrons' } },
      { category:'unilag', subject:'Chemistry', topic:'Mole Concept', year:2021, question:"Avogadro's number is approximately:", optionA:'6.02 × 10²³', optionB:'6.02 × 10²⁴', optionC:'3.01 × 10²³', optionD:'6.02 × 10²²', answer:'A', explanation:"Avogadro's constant = 6.02 × 10²³ mol⁻¹, representing the number of particles in one mole of a substance." },
      { category:'unilag', subject:'Chemistry', topic:'Organic Chemistry', year:2022, question:'The functional group of carboxylic acids is:', optionA:'-COOH', optionB:'-OH', optionC:'-CHO', optionD:'-CO-', answer:'A', explanation:'Carboxylic acids contain the carboxyl group (-COOH), which consists of a carbonyl group and a hydroxyl group.' },
      { category:'unilag', subject:'Chemistry', topic:'Periodic Table', year:2021, question:'Elements in the same group of the periodic table have the same:', optionA:'Number of valence electrons', optionB:'Atomic mass', optionC:'Number of neutrons', optionD:'Atomic radius', answer:'A', explanation:'Elements in the same group have the same number of valence electrons, giving them similar chemical properties.' },

      // ── Physics ──
      { category:'unilag', subject:'Physics', topic:'Mechanics', year:2022, question:'A body moving at uniform velocity has:', optionA:'Zero acceleration', optionB:'Constant acceleration', optionC:'Increasing speed', optionD:'Net force acting on it', answer:'A', explanation:'Uniform velocity means constant speed in a constant direction, which means zero acceleration.' },
      { category:'unilag', subject:'Physics', topic:'Waves', year:2021, question:'The speed of light in vacuum is approximately:', optionA:'3 × 10⁸ m/s', optionB:'3 × 10⁶ m/s', optionC:'3 × 10¹⁰ m/s', optionD:'3 × 10⁴ m/s', answer:'A', explanation:'The speed of light in vacuum c ≈ 3 × 10⁸ m/s (299,792,458 m/s).' },
      { category:'unilag', subject:'Physics', topic:'Electricity', year:2022, question:"Ohm's law states that current is:", optionA:'Directly proportional to voltage at constant resistance', optionB:'Inversely proportional to voltage', optionC:'Independent of resistance', optionD:'Equal to resistance', answer:'A', explanation:"Ohm's Law: V = IR. At constant resistance, current I is directly proportional to voltage V." },
    ];

    await prisma.question.createMany({ data: questions });
    console.log(`✅ ${questions.length} questions seeded\n`);
  }

  // ─── BLOG POSTS ───────────────────────────────────────
  const existingPosts = await prisma.blogPost.count();
  if (existingPosts > 0) {
    console.log(`ℹ️  Blog posts already exist. Skipping.\n`);
  } else {
    await prisma.blogPost.createMany({
      data: [
        {
          title:      'UNILAG Post-UTME 2026: Everything You Need to Know',
          slug:       'unilag-post-utme-2026-guide',
          excerpt:    'A complete breakdown of the UNILAG Post-UTME 2026 screening — format, subjects, cut-off marks, and how to prepare.',
          content:    '<h2>About UNILAG Post-UTME 2026</h2><p>The University of Lagos Post-UTME screening is a computer-based test that assesses candidates who scored above the cut-off mark in the JAMB UTME. This guide covers everything you need to know.</p><h2>Exam Format</h2><p>The UNILAG Post-UTME typically consists of 40 questions across your selected subject combination, to be completed in 30 minutes. The exam is entirely CBT-based.</p><h2>Compulsory Subjects</h2><p>Every candidate must answer questions in Use of English, Mathematics, and General Knowledge regardless of their chosen course.</p>',
          category:   'post-utme',
          published:  true,
          publishedAt: new Date('2026-04-14'),
        },
        {
          title:      'How to Build a 60-Day Study Plan for UNILAG Post-UTME',
          slug:       'unilag-post-utme-60-day-study-plan',
          excerpt:    'A practical, realistic study schedule that balances subject coverage, timed practice, and rest — designed for Nigerian students.',
          content:    '<h2>Why You Need a Study Plan</h2><p>Preparing for the UNILAG Post-UTME without a plan is like navigating Lagos without Google Maps — possible, but unnecessarily stressful. A structured 60-day plan ensures you cover all subjects while building exam confidence through consistent practice.</p><h2>Weeks 1–2: Foundation</h2><p>Spend the first two weeks reviewing key topics in each subject. Use Study Topic Mode on Prezidox Academy to go topic by topic without time pressure.</p><h2>Weeks 3–5: Practice</h2><p>Start attempting full subject sessions. Use Mastery Mode to identify and drill weak areas.</p><h2>Weeks 6–8: Simulation</h2><p>Run full CBT mock exams under timed conditions. Aim for at least one full exam per day.</p>',
          category:   'study-tips',
          published:  true,
          publishedAt: new Date('2026-04-07'),
        },
      ],
    });
    console.log('✅ 2 blog posts seeded\n');
  }

  // ─── FIX EXISTING USERS ──────────────────────────────
  // Ensure all existing users have profileComplete=true so they are not
  // redirected to the profile-setup wizard on login.
  const allUsers = await prisma.user.findMany({
    select: { id: true, examFocus: true, selectedSubjects: true, profileComplete: true },
  });

  let fixedCount = 0;
  for (const u of allUsers) {
    const needsFix = !u.profileComplete
      || !u.examFocus
      || !u.selectedSubjects
      || u.selectedSubjects.length === 0;

    if (needsFix) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          profileComplete:  true,
          examFocus:        u.examFocus || 'unilag',
          selectedSubjects: (u.selectedSubjects && u.selectedSubjects.length > 0)
            ? u.selectedSubjects
            : ['Use of English', 'General Paper', 'Mathematics', 'Biology'],
        },
      });
      fixedCount++;
    }
  }
  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} existing user(s) — profileComplete set to true\n`);
  } else {
    console.log(`ℹ️  All existing users already have profileComplete set\n`);
  }

  console.log('✅ Database seeding complete!\n');
  console.log('═══════════════════════════════════════════');
  console.log(`  Admin Login: ${adminEmail}`);
  console.log(`  Password:    ${adminPassword}`);
  console.log(`  URL:         http://localhost:3000/admin/login.html`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
